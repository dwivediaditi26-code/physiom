import React, { useState } from "react";
import { SectionIntro, TextField, SelectField, Segmented, TextArea, Stepper, InfoButton, useSectionData, BRAND } from "./orthoFieldKit.jsx";
import { EXERCISE_DB, ALL_EXERCISES, PROGRAMME_TEMPLATES } from "./sharedClinicalData.js";
import { matchRegionKey } from "./orthoClinicalData.js";

/* ============================================================
   EXERCISE PRESCRIPTION — the same exercise library + programme
   builder Treatment's own Exercise tab (ClinicalModules.jsx's
   ExercisePrescriptionModule, data.tx_exercise_prescription) has
   always had: browse a real, clinically-sourced exercise database by
   region/phase, quick-apply a named condition protocol, add exercises
   to a per-patient programme, and adjust each one's Sets/Reps/Hold/
   Frequency. Same underlying data (EXERCISE_DB / ALL_EXERCISES /
   PROGRAMME_TEMPLATES, unchanged), rebuilt on this file's own
   field-kit instead of ClinicalModules.jsx's older inline-styled form
   -- same pattern as Treatment Techniques above. Sets/Reps/Hold are
   +/- steppers (2026-08-26, user feedback on Techniques carried over
   here too); Frequency stays a quick-pick since it's categorical
   ("Daily", "3×/day"), not a count.
   ============================================================ */
const PHASES = ["All", "Phase 1", "Phase 2", "Phase 3"];
const FREQ_OPTIONS = ["Hourly", "2×/day", "3×/day", "Daily", "2×/week", "3×/week", "Weekly", "As needed"];

function StepperField({ label, value, onChange, unit, max = 60 }) {
  return (
    <div className="vital-field">
      <div className="vital-label-row">
        <span className="vital-label">{label}</span>
      </div>
      <Stepper value={value} onChange={onChange} min={0} max={max} step={1} />
      {unit && <div className="hint" style={{ marginTop: 2 }}>{unit}</div>}
    </div>
  );
}

function exerciseInfoBody(ex) {
  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <b>Target:</b> {ex.target}
      </div>
      <div style={{ marginBottom: 10 }}>{ex.desc}</div>
      {ex.cues && (
        <div style={{ background: BRAND.amberBg, borderRadius: 10, padding: "8px 10px", marginBottom: 10, fontSize: 12.5 }}>
          💡 {ex.cues}
        </div>
      )}
      {ex.progression && (
        <div style={{ fontSize: 12.5, color: BRAND.green }}>📈 Progression: {ex.progression}</div>
      )}
    </>
  );
}

// richItem (not a plain `text` string) so the "How to Perform" sheet gets
// a reference-photo slot (SheetHero, orthoFieldKit.jsx) the same way ROM/
// MMT/Special Tests already do -- `image` is a Cloudinary asset id.
// 2026-09-02, Aditi: "exercise photo same as study mode is not showing" --
// this said `image: ex.image` despite EXERCISE_DB never actually carrying
// an `image` field (confirmed: zero entries have one), so it was always
// undefined and every exercise showed the "No reference photo" fallback
// no matter what. romRichItem/mmtRichItem/specialRichItem (same file's
// siblings, orthoRegionAssessments.jsx) all wire this to the item's own
// id instead -- SheetHero looks that id up directly as the Cloudinary
// asset name -- so a photo just has to be uploaded under an exercise's id
// (e.g. "lb_glute_bridge") to show up here with no further code change,
// same as ROM/MMT/Special Tests already work. Matching that convention.
function exerciseRichItem(ex) {
  return {
    image: ex.id,
    title: ex.name,
    subtitle: ex.target,
    perform: exerciseInfoBody(ex),
  };
}

function ExerciseLibraryCard({ ex, inProgramme, onAdd, onRemove }) {
  return (
    <div className="tech-card">
      <div className="tech-card-head">
        <div className="tech-card-title">
          {ex.name}
          <div style={{ fontWeight: 400, fontSize: 11.5, color: BRAND.gray, marginTop: 2 }}>{ex.target}</div>
        </div>
        <div className="tech-card-actions">
          <InfoButton title={ex.name} richItem={exerciseRichItem(ex)} eyebrow="EXERCISE" />
          <button
            type="button"
            className={inProgramme ? "tech-card-del" : "tech-card-edit"}
            onClick={inProgramme ? onRemove : onAdd}
            aria-label={inProgramme ? "Remove from programme" : "Add to programme"}
          >
            {inProgramme ? "✕" : "+"}
          </button>
        </div>
      </div>
      <div className="tech-card-meta">
        {ex.sets} × {ex.reps}{ex.hold ? ` · hold ${ex.hold}s` : ""} · {ex.freq} · {ex.phase}
      </div>
    </div>
  );
}

function ProgrammeEntryCard({ ex, onUpdate, onRemove }) {
  return (
    <div className="tech-card">
      <div className="tech-card-head">
        <div className="tech-card-title">{ex.name}</div>
        <div className="tech-card-actions">
          <button type="button" className="tech-card-del" onClick={onRemove} aria-label="Remove">✕</button>
        </div>
      </div>
      <div className="row-2" style={{ flexWrap: "wrap", gap: 12, marginTop: 8 }}>
        <StepperField label="Sets" unit="sets" value={ex.customSets} onChange={(v) => onUpdate("customSets", v)} max={10} />
        <StepperField label="Reps" unit="reps" value={ex.customReps} onChange={(v) => onUpdate("customReps", v)} max={50} />
        <StepperField label="Hold" unit="sec" value={ex.customHold} onChange={(v) => onUpdate("customHold", v)} max={180} />
      </div>
      <div style={{ marginTop: 8 }}>
        <Segmented label="Frequency" wrap options={FREQ_OPTIONS} value={ex.customFreq} onChange={(v) => onUpdate("customFreq", v)} />
      </div>
      <div style={{ marginTop: 8 }}>
        <TextArea label="Notes" value={ex.notes} onChange={(v) => onUpdate("notes", v)} placeholder="Cues, modifications for this patient..." />
      </div>
    </div>
  );
}

export function ExercisePrescriptionSection({ data, setData, selectedRegions = [] }) {
  const [d, set] = useSectionData(data, setData, "exercisePrescription");
  const programme = Array.isArray(d.programme) ? d.programme : [];
  // Defaults to the case's own first selected region (same matchRegionKey
  // ROM/MMT/Special Tests/CPA already use) instead of always "cervical" --
  // previously this always opened on Cervical Spine exercises regardless
  // of the actual case, e.g. showing Chin Tucks for a lumbar-only patient.
  // matchRegionKey() now returns null rather than guessing when there's no
  // real match (see its own comment) -- for picking a starting TAB that's
  // fine to fall back arbitrarily on, unlike the clinical-content call
  // sites that need to know "no match" means "skip it", so the fallback
  // lives here rather than inside matchRegionKey itself.
  const defaultRegionKey = (selectedRegions.length && matchRegionKey(selectedRegions[0].id, Object.keys(EXERCISE_DB))) || Object.keys(EXERCISE_DB)[0];
  const [activeRegion, setActiveRegion] = useState(defaultRegionKey);
  const [activePhase, setActivePhase] = useState("All");
  const [search, setSearch] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const setProgramme = (next) => set("programme", next);
  const addEx = (ex) => {
    if (programme.find((p) => p.id === ex.id)) return;
    setProgramme([...programme, { ...ex, customSets: ex.sets, customReps: ex.reps, customHold: ex.hold, customFreq: ex.freq, notes: "" }]);
  };
  const removeEx = (id) => setProgramme(programme.filter((p) => p.id !== id));
  const updateEx = (id, field, val) => setProgramme(programme.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  const applyTemplate = (key) => {
    const t = PROGRAMME_TEMPLATES[key];
    if (!t) return;
    const exs = t.exercises.map((id) => ALL_EXERCISES.find((e) => e.id === id)).filter((e) => e && !programme.find((p) => p.id === e.id));
    if (!exs.length) return;
    setProgramme([...programme, ...exs.map((ex) => ({ ...ex, customSets: ex.sets, customReps: ex.reps, customHold: ex.hold, customFreq: ex.freq, notes: "" }))]);
  };

  const region = EXERCISE_DB[activeRegion];
  const relevantTemplates = Object.entries(PROGRAMME_TEMPLATES).filter(([, t]) => region?.label && (region.label.includes(t.region) || t.region.includes(region.label)));
  const filteredCategories = region
    ? Object.entries(region.categories).reduce((acc, [cat, exs]) => {
        const filtered = exs.filter(
          (e) => (activePhase === "All" || e.phase === activePhase) && (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.target.toLowerCase().includes(search.toLowerCase()))
        );
        if (filtered.length) acc[cat] = filtered;
        return acc;
      }, {})
    : {};

  return (
    <>
      <SectionIntro icon="🏋" title="Exercise Prescription" info="Browse the exercise library by region, add to this patient's programme, then adjust sets/reps/hold/frequency for them specifically." />

      {relevantTemplates.length > 0 && (
        <>
          <button type="button" className="collapsible-head" onClick={() => setTemplatesOpen((o) => !o)}>
            <span>Quick-apply protocol ({relevantTemplates.length})</span>
            <span className={"collapsible-chevron" + (templatesOpen ? " open" : "")}>⌄</span>
          </button>
          {templatesOpen && (
            <div className="template-list">
              {relevantTemplates.map(([key, t]) => (
                <button type="button" key={key} className="template-row" onClick={() => applyTemplate(key)}>
                  <div>
                    <div className="template-row-label">{t.label}</div>
                    {t.note && <div className="template-row-note">{t.note}</div>}
                  </div>
                  <span className="template-row-arrow">+</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="subheading">Browse exercises</div>
      <SelectField label="Region" type="single" options={Object.values(EXERCISE_DB).map((r) => r.label)} value={region?.label} onChange={(label) => setActiveRegion(Object.keys(EXERCISE_DB).find((k) => EXERCISE_DB[k].label === label) || activeRegion)} />
      <Segmented label="Phase" options={PHASES} value={activePhase} onChange={(v) => setActivePhase(v || "All")} />
      <TextField label="Search" value={search} onChange={setSearch} placeholder="Search exercises or muscles..." />

      {Object.entries(filteredCategories).map(([cat, exs]) => (
        <div key={cat}>
          <div className="subheading" style={{ marginTop: 14 }}>{cat}</div>
          {exs.map((ex) => (
            <ExerciseLibraryCard key={ex.id} ex={ex} inProgramme={!!programme.find((p) => p.id === ex.id)} onAdd={() => addEx(ex)} onRemove={() => removeEx(ex.id)} />
          ))}
        </div>
      ))}
      {Object.keys(filteredCategories).length === 0 && <div className="summary-empty">No exercises match this filter.</div>}

      <div className="subheading" style={{ marginTop: 18 }}>This patient's programme ({programme.length})</div>
      {programme.length === 0 && <div className="summary-empty">No exercises added yet — add some from the library above.</div>}
      {programme.map((ex) => (
        <ProgrammeEntryCard key={ex.id} ex={ex} onUpdate={(field, val) => updateEx(ex.id, field, val)} onRemove={() => removeEx(ex.id)} />
      ))}
    </>
  );
}

/* formatters[stepId] contract for orthoSummary.jsx */
export function formatExercisePrescriptionSection(section) {
  const programme = Array.isArray(section.programme) ? section.programme : [];
  if (!programme.length) return [];
  return programme.map((ex) => ({
    label: ex.name,
    value: `${ex.customSets} × ${ex.customReps}${ex.customHold ? ` · hold ${ex.customHold}s` : ""} · ${ex.customFreq}`,
  }));
}

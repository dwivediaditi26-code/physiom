import React, { useState } from "react";
import { BRAND } from "./orthoFieldKit.jsx";
import { EXERCISE_DB, ALL_EXERCISES, PROGRAMME_TEMPLATES, EVIDENCE_PROTOCOLS } from "./sharedClinicalData.js";
import { ExerciseLibraryCard } from "./exerciseCardKit.jsx";

/* ============================================================
   EVIDENCE-BASED PROTOCOL BROWSER (2026-09-11) -- condition/
   operation picker -> phase tabs -> phase goals -> exercise list,
   built once and embedded in three places: the Exercise Prescription
   step's "Exercise Library" sheet, its "Featured Protocols" tab, and
   the Care Plan's "Add treatment" sheet. Each host wires its own
   `onAddExercise` (a raw EXERCISE_DB-shaped object) into whatever it
   already does with a picked exercise (addEx / startDose) -- this
   component never knows or cares which.
   ============================================================ */

// Two-line phase pill ("Phase 1" / "0-2 weeks") -- matches the reference
// mockup's phase tabs instead of the plain single-line Segmented control.
function PhasePill({ label, n, weeks, active, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      style={{
        flex: 1, minWidth: 0, textAlign: "center", padding: "8px 6px", borderRadius: 10, fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        border: `1.5px solid ${active ? BRAND.purple : BRAND.border}`,
        background: active ? BRAND.purpleFaint : "#fff",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 12, color: active ? BRAND.purpleDark : BRAND.ink }}>Phase {n}</div>
      <div style={{ fontSize: 10, color: active ? BRAND.purpleDark : BRAND.gray, marginTop: 1 }}>{weeks || "—"}</div>
    </button>
  );
}

function regionKeyForLabel(label) {
  return Object.keys(EXERCISE_DB).find((k) => EXERCISE_DB[k].label.includes(label) || label.includes(EXERCISE_DB[k].label)) || null;
}

const PHASE_KEYS_USED = new Set(EVIDENCE_PROTOCOLS.flatMap((o) => (o.phases || []).map((p) => p.key)));

// Every PROGRAMME_TEMPLATES entry not already wrapped by a multi-phase
// EVIDENCE_PROTOCOLS operation above becomes its own single-phase
// "condition" entry, so the full region-wise condition library (Acute
// LBP, Hip OA, PFPS, Frozen Shoulder phases, ...) is reachable from here
// too (2026-09-16, Aditi: "quick templates of protocol ... should be put
// in the evidence based protocol recommended in the treatment section,
// not in the home protocol") -- previously only the 7 curated surgical/
// operation entries above were reachable here; the ~30 other condition-
// wise templates were reachable only from Exercise Prescription's own
// "Quick-apply protocol", which is the wrong place per that feedback.
const CONDITION_ENTRIES = Object.entries(PROGRAMME_TEMPLATES)
  .filter(([key]) => !PHASE_KEYS_USED.has(key))
  .map(([key, t]) => ({
    id: `cond_${key}`,
    label: t.label,
    regionKey: regionKeyForLabel(t.region),
    live: true,
    phases: [{ key, label: t.label, weeks: "" }],
  }));

const ALL_OPERATIONS = [...EVIDENCE_PROTOCOLS, ...CONDITION_ENTRIES];

// Grouped by region (native <optgroup>) so the dropdown reads condition-
// wise AND region-wise, per the same feedback.
const GROUPED_OPERATIONS = Object.keys(EXERCISE_DB)
  .map((rk) => ({ regionKey: rk, label: EXERCISE_DB[rk].label, ops: ALL_OPERATIONS.filter((o) => o.regionKey === rk) }))
  .filter((g) => g.ops.length);

export function EvidenceProtocolBrowser({ initialOperationId, onAddExercise, isAdded }) {
  const initialOp = ALL_OPERATIONS.find((o) => o.id === initialOperationId && o.live) || ALL_OPERATIONS.find((o) => o.live);
  const [operationId, setOperationId] = useState(initialOp?.id || null);
  const [phaseKey, setPhaseKey] = useState(initialOp?.phases?.[0]?.key || null);

  const operation = ALL_OPERATIONS.find((o) => o.id === operationId);
  const phase = operation?.phases.find((p) => p.key === phaseKey) || operation?.phases?.[0];
  const template = phase ? PROGRAMME_TEMPLATES[phase.key] : null;
  const exercises = template ? template.exercises.map((id) => ALL_EXERCISES.find((e) => e.id === id)).filter(Boolean) : [];

  const selectOperation = (id) => {
    const op = ALL_OPERATIONS.find((o) => o.id === id);
    setOperationId(id);
    setPhaseKey(op?.phases?.[0]?.key || null);
  };

  return (
    <div>
      <div className="subheading">Select condition / operation</div>
      <select
        value={operationId || ""}
        onChange={(e) => selectOperation(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${BRAND.border}`, background: "#fff", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 600, color: BRAND.ink }}
      >
        {GROUPED_OPERATIONS.map((g) => (
          <optgroup key={g.regionKey} label={`${EXERCISE_DB[g.regionKey]?.icon || "🏋"} ${g.label}`}>
            {g.ops.map((op) => (
              <option key={op.id} value={op.id} disabled={!op.live}>
                {op.label}{!op.live ? " — coming soon" : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {operation && (
        <>
          {operation.phases.length > 1 && (
            <>
              <div className="subheading" style={{ marginTop: 14 }}>Select phase</div>
              <div style={{ display: "flex", gap: 6 }}>
                {operation.phases.map((p, i) => (
                  <PhasePill key={p.key} n={i + 1} weeks={p.weeks} active={p.key === phaseKey} onClick={() => setPhaseKey(p.key)} />
                ))}
              </div>
            </>
          )}

          {template?.goals && (
            <div style={{ background: BRAND.purpleFaint, borderRadius: 10, padding: "10px 12px", marginTop: 10 }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: BRAND.purpleDark, marginBottom: 4 }}>
                🎯 Phase {operation.phases.findIndex((p) => p.key === phaseKey) + 1} goals
              </div>
              <div style={{ fontSize: "0.8rem", color: BRAND.purpleDark, lineHeight: 1.5 }}>{template.goals}</div>
            </div>
          )}
          {template?.note && (
            <div style={{ background: BRAND.amberBg, borderRadius: 10, padding: "10px 12px", marginTop: 8, fontSize: "0.78rem", color: BRAND.ink, lineHeight: 1.5 }}>
              ⚠ {template.note}
            </div>
          )}

          <div className="subheading" style={{ marginTop: 14 }}>Evidence-Based Exercise Protocol</div>
          {exercises.length === 0 && <div className="summary-empty">No exercises in this phase.</div>}
          {exercises.map((ex) => (
            <ExerciseLibraryCard
              key={ex.id}
              ex={ex}
              tag={operation.label}
              onAdd={() => onAddExercise(ex)}
              inProgramme={!!isAdded?.(ex)}
              onRemove={() => {}}
            />
          ))}
        </>
      )}
    </div>
  );
}

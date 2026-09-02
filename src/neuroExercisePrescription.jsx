import React, { useState } from "react";
import { PersonStanding, Footprints, Target, Dumbbell, Brain, RefreshCw, Waves } from "lucide-react";
import { TextField, Segmented, useSectionData } from "./orthoFieldKit.jsx";
import { EXERCISE_DB } from "./sharedClinicalData.js";
import { ProgrammeEntryCard, StepperField } from "./orthoExercisePrescription.jsx";
import StudyImage from "./physiofeed/learn/StudyImage.jsx";

/* ============================================================
   NEURO EXERCISE LIBRARY (2026-09-02, Aditi: "keep the main page
   simple ... browse by category, condition, or body/function, then
   open an exercise ... don't show dosage/precautions/evidence/
   progression on the main list, those belong in the Exercise Detail
   page"). Full redesign of the first pass, which reused Ortho's
   dense list-with-inline-dosage cards -- this instead follows:

     Library (search + category tiles + condition chips)
       → list (image, name, difficulty, duration, +Add)
         → detail (full description/cues/progression/evidence +
                    dosage steppers) → Add to Treatment Plan
           → programme (this patient's built programme)

   Reuses EXERCISE_DB.neurological (same real data as before) --
   condition tags and difficulty/duration are derived per category/
   phase here rather than authored per exercise, since exercises
   within a category are genuinely similar in who they suit and how
   long they take; this avoids re-authoring 30+ entries a second time
   for a UI reshuffle.
   ============================================================ */
const CATEGORY_META = {
  "Balance & Proprioception":                { Icon: PersonStanding, short: "Balance",              conditions: ["Stroke", "Parkinson's", "SCI", "TBI", "MS", "Vestibular"] },
  "Gait Training":                           { Icon: Footprints,     short: "Gait",                 conditions: ["Stroke", "Parkinson's", "SCI", "TBI", "MS", "GBS"] },
  "Motor Relearning":                        { Icon: Target,         short: "Motor Control",        conditions: ["Stroke", "TBI", "SCI"] },
  "Range of Motion & Spasticity Management": { Icon: Dumbbell,       short: "Strength & Flexibility", conditions: ["Stroke", "SCI", "TBI", "CP", "MS"] },
  "Coordination Training":                   { Icon: Brain,          short: "Coordination",         conditions: ["MS", "TBI", "SCI", "Stroke", "GBS"] },
  "Functional Mobility & Transfers":         { Icon: RefreshCw,      short: "Transfers",            conditions: ["Stroke", "SCI", "TBI", "GBS", "MS", "Parkinson's"] },
  "Vestibular Rehabilitation":               { Icon: Waves,          short: "Vestibular",           conditions: ["Vestibular", "Stroke", "TBI"] },
};
const ALL_CONDITIONS = ["Stroke", "Parkinson's", "SCI", "TBI", "MS", "GBS", "CP", "Vestibular"];
const DIFFICULTY_BY_PHASE = { "Phase 1": "Beginner", "Phase 2": "Intermediate", "Phase 3": "Advanced" };
const FREQ_OPTIONS = ["Hourly", "2×/day", "3×/day", "Daily", "2–3×/day", "3×/week", "5×/week", "Weekly", "Every 2 hrs"];

function difficultyOf(ex) {
  return DIFFICULTY_BY_PHASE[ex.phase] || "Intermediate";
}
// Rough estimate only (shown as a quick scan cue on the list, not a
// clinical claim) -- reps at ~4s each plus any static hold, times sets.
function durationOf(ex) {
  const totalSec = (ex.sets || 1) * ((ex.reps || 1) * 4 + (ex.hold || 0));
  return `${Math.max(1, Math.round(totalSec / 60))} min`;
}
function exercisesForCategory(cat) {
  return EXERCISE_DB.neurological.categories[cat] || [];
}
function exercisesForCondition(cond) {
  return Object.entries(EXERCISE_DB.neurological.categories)
    .filter(([cat]) => CATEGORY_META[cat]?.conditions.includes(cond))
    .flatMap(([, exs]) => exs);
}
const ALL_NEURO_EXERCISES = Object.values(EXERCISE_DB.neurological.categories).flat();

const DIFF_COLOR = { Beginner: "#16a34a", Intermediate: "#d97706", Advanced: "#dc2626" };
const DIFF_BG = { Beginner: "#dcfce7", Intermediate: "#fef3c7", Advanced: "#fee2e2" };

function ExerciseListCard({ ex, inProgramme, onOpen, onQuickAdd }) {
  return (
    <div className="tech-card" style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={onOpen}>
      <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
        <StudyImage name={ex.id} square size={52} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tech-card-title" style={{ fontSize: 13.5 }}>{ex.name}</div>
        <div style={{ fontWeight: 400, fontSize: 11.5, color: "#8a8a99", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.target}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, color: DIFF_COLOR[difficultyOf(ex)], background: DIFF_BG[difficultyOf(ex)] }}>{difficultyOf(ex)}</span>
          <span style={{ fontSize: 11, color: "#8a8a99" }}>▶️ {durationOf(ex)}</span>
        </div>
      </div>
      <button
        type="button"
        className={inProgramme ? "tech-card-del" : "tech-card-edit"}
        onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
        aria-label={inProgramme ? "Remove from programme" : "Add to programme"}
        style={{ flexShrink: 0 }}
      >
        {inProgramme ? "✕" : "＋ Add"}
      </button>
    </div>
  );
}

function ExerciseDetail({ ex, inProgramme, onAdd, onRemove, onBack }) {
  const [sets, setSets] = useState(ex.sets);
  const [reps, setReps] = useState(ex.reps);
  const [hold, setHold] = useState(ex.hold);
  const [freq, setFreq] = useState(ex.freq);
  return (
    <div>
      <button type="button" className="ghost-btn" onClick={onBack} style={{ marginBottom: 12 }}>← Back</button>
      <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
        <StudyImage name={ex.id} full />
      </div>
      <div style={{ fontWeight: 800, fontSize: 19, marginBottom: 2 }}>{ex.name}</div>
      <div style={{ fontSize: 13, color: "#8a8a99", marginBottom: 10 }}>{ex.target}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, color: DIFF_COLOR[difficultyOf(ex)], background: DIFF_BG[difficultyOf(ex)] }}>{difficultyOf(ex)}</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, color: "#7c3aed", background: "#ede9fe" }}>{ex.evidence} evidence</span>
      </div>
      <div style={{ marginBottom: 12 }}>{ex.desc}</div>
      {ex.cues && <div style={{ background: "#fef3c7", borderRadius: 10, padding: "8px 10px", marginBottom: 10, fontSize: 12.5 }}>💡 {ex.cues}</div>}
      {ex.progression && <div style={{ fontSize: 12.5, color: "#16a34a", marginBottom: 14 }}>📈 Progression: {ex.progression}</div>}

      <div className="subheading">Dosage for this patient</div>
      <div className="row-2" style={{ flexWrap: "wrap", gap: 12, marginTop: 8, marginBottom: 8 }}>
        <StepperField label="Sets" unit="sets" value={sets} onChange={setSets} max={20} />
        <StepperField label="Reps" unit="reps" value={reps} onChange={setReps} max={60} />
        <StepperField label="Hold" unit="sec" value={hold} onChange={setHold} max={600} />
      </div>
      <Segmented label="Frequency" wrap options={FREQ_OPTIONS} value={freq} onChange={setFreq} />

      <button
        type="button"
        className="primary-btn"
        style={{ width: "100%", marginTop: 16 }}
        onClick={inProgramme ? onRemove : () => onAdd({ sets, reps, hold, freq })}
      >
        {inProgramme ? "✕ Remove from Treatment Plan" : "＋ Add to Treatment Plan"}
      </button>
    </div>
  );
}

export function NeuroExercisePrescriptionSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "neuroExercisePrescription");
  const programme = Array.isArray(d.programme) ? d.programme : [];
  const [view, setView] = useState("browse"); // browse | list | detail | programme
  const [listSource, setListSource] = useState(null); // { kind: "category"|"condition", value }
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const setProgramme = (next) => set("programme", next);
  const addEx = (ex, dosage) => {
    if (programme.find((p) => p.id === ex.id)) return;
    setProgramme([...programme, { ...ex, customSets: dosage?.sets ?? ex.sets, customReps: dosage?.reps ?? ex.reps, customHold: dosage?.hold ?? ex.hold, customFreq: dosage?.freq ?? ex.freq, notes: "" }]);
  };
  const removeEx = (id) => setProgramme(programme.filter((p) => p.id !== id));
  const updateEx = (id, field, val) => setProgramme(programme.map((p) => (p.id === id ? { ...p, [field]: val } : p)));

  const searchResults = search.trim() ? ALL_NEURO_EXERCISES.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.target.toLowerCase().includes(search.toLowerCase())) : [];
  const listExercises = listSource?.kind === "category" ? exercisesForCategory(listSource.value) : listSource?.kind === "condition" ? exercisesForCondition(listSource.value) : [];
  const selectedEx = ALL_NEURO_EXERCISES.find((e) => e.id === selectedId) || null;

  const openList = (kind, value) => { setListSource({ kind, value }); setSearch(""); setView("list"); };
  const openDetail = (id) => { setSelectedId(id); setView("detail"); };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 19 }}>🏋 Exercise Library</div>
        <button type="button" onClick={() => setView("programme")} style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
          Treatment Plan ({programme.length})
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: "#8a8a99", marginBottom: 14 }}>Neuro Rehabilitation</div>

      {view === "browse" && (
        <>
          <TextField label="" value={search} onChange={setSearch} placeholder="🔍 Search exercises..." />

          {search.trim() ? (
            <>
              <div className="subheading" style={{ marginTop: 14 }}>Results ({searchResults.length})</div>
              {searchResults.length === 0 && <div className="summary-empty">No exercises match this search.</div>}
              {searchResults.map((ex) => (
                <ExerciseListCard key={ex.id} ex={ex} inProgramme={!!programme.find((p) => p.id === ex.id)} onOpen={() => openDetail(ex.id)} onQuickAdd={() => (programme.find((p) => p.id === ex.id) ? removeEx(ex.id) : addEx(ex))} />
              ))}
            </>
          ) : (
            <>
              <div className="subheading" style={{ marginTop: 14 }}>Categories</div>
              {/* gridTemplateColumns uses repeat(auto-fit,minmax(...)) rather
                  than a literal "1fr 1fr" -- utils.jsx has a global mobile
                  override that force-collapses any inline grid style
                  containing that exact substring to 1 column below 400px
                  width (same issue AppFull.jsx's specialty-card grid hit),
                  which combined with aspectRatio turned each tile into a
                  near full-height rectangle instead of a compact square. */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 18 }}>
                {Object.entries(CATEGORY_META).map(([cat, meta]) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => openList("category", cat)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, aspectRatio: "1", maxWidth: 170, borderRadius: 14, border: "1.5px solid #EEEDF5", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <meta.Icon size={26} strokeWidth={1.75} color="#7c3aed" />
                    <span style={{ fontWeight: 700, fontSize: 12.5, color: "#1a1a2e", textAlign: "center" }}>{meta.short}</span>
                  </button>
                ))}
              </div>

              <div className="subheading">By Condition</div>
              <div className="chip-row" style={{ marginTop: 8 }}>
                {ALL_CONDITIONS.map((cond) => (
                  <button key={cond} type="button" className="chip-btn" onClick={() => openList("condition", cond)}>
                    {cond}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {view === "list" && (
        <>
          <button type="button" className="ghost-btn" onClick={() => setView("browse")} style={{ marginBottom: 12 }}>← Back</button>
          <div className="subheading" style={{ marginTop: 0 }}>{listSource?.kind === "category" ? (CATEGORY_META[listSource.value]?.short || listSource.value) : listSource?.value}</div>
          {listExercises.length === 0 && <div className="summary-empty">No exercises in this group yet.</div>}
          {listExercises.map((ex) => (
            <ExerciseListCard key={ex.id} ex={ex} inProgramme={!!programme.find((p) => p.id === ex.id)} onOpen={() => openDetail(ex.id)} onQuickAdd={() => (programme.find((p) => p.id === ex.id) ? removeEx(ex.id) : addEx(ex))} />
          ))}
        </>
      )}

      {view === "detail" && selectedEx && (
        <ExerciseDetail
          ex={selectedEx}
          inProgramme={!!programme.find((p) => p.id === selectedEx.id)}
          onAdd={(dosage) => { addEx(selectedEx, dosage); setView(listSource ? "list" : "browse"); }}
          onRemove={() => { removeEx(selectedEx.id); setView(listSource ? "list" : "browse"); }}
          onBack={() => setView(listSource ? "list" : "browse")}
        />
      )}

      {view === "programme" && (
        <>
          <button type="button" className="ghost-btn" onClick={() => setView("browse")} style={{ marginBottom: 12 }}>← Back to Library</button>
          <div className="subheading" style={{ marginTop: 0 }}>This patient's programme ({programme.length})</div>
          {programme.length === 0 && <div className="summary-empty">No exercises added yet — browse the library and add some.</div>}
          {programme.map((ex) => (
            <ProgrammeEntryCard key={ex.id} ex={ex} onUpdate={(field, val) => updateEx(ex.id, field, val)} onRemove={() => removeEx(ex.id)} />
          ))}
        </>
      )}
    </>
  );
}

/* formatters[stepId] contract for orthoSummary.jsx (see
   ALWAYS_STEP_IDS/orthoSummaryFormatters below in
   NeurologicalAssessment.jsx) -- same shape as Ortho's own
   formatExercisePrescriptionSection. */
export function formatNeuroExercisePrescriptionSection(section) {
  const programme = Array.isArray(section.programme) ? section.programme : [];
  if (!programme.length) return [];
  return programme.map((ex) => ({
    label: ex.name,
    value: `${ex.customSets} × ${ex.customReps}${ex.customHold ? ` · hold ${ex.customHold}s` : ""} · ${ex.customFreq}`,
  }));
}

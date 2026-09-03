import React, { useState, useMemo, useEffect } from "react";
import { SectionIntro, TextField, TextArea, SelectField, Segmented, Stepper, useSectionData, BRAND } from "./orthoFieldKit.jsx";
import { EXERCISE_DB } from "./sharedClinicalData.js";
import {
  deriveNeuroProblems, buildGoalsForProblem, PROBLEM_CATEGORIES, categoryLabel,
  REFERENCES, ASSIST_LADDER, problemById,
  conditionLabel, settingLabel, conditionSettingPrecautions,
  recommendInterventions,
} from "./neuroClinicalKnowledge.js";

/* ============================================================
   NEURO CARE PLAN (2026-09-02) — the clinical spine of the Neuro
   workflow, per Aditi's spec:

     Assessment findings → Suggested Problems → therapist selects
       → Goals (pre-filled from the patient's own baseline, editable)
         → goal-wise Treatment selection
           → Treatment Plan

   Design rules taken directly from that spec:
     - Never make the therapist type the same thing twice. Everything
       here is pre-filled from values already recorded in the Neuro
       assessment (see neuroClinicalKnowledge.js's rules engine).
     - Suggestions are never auto-applied. Nothing is selected for the
       therapist; every suggested problem/goal must be explicitly chosen,
       and every field stays editable.
     - Manual entry is always available alongside suggestions -- an
       automatic suggestion must never be the ONLY way to add something.
     - One treatment can serve several goals WITHOUT duplicating the
       treatment record (see `goalIds` on each treatment).

   Stored under data.neuroCarePlan = { problems[], goals[], treatments[] }.
   ============================================================ */

const PHASES = [
  { id: "problems", label: "Problems", n: 1 },
  { id: "goals", label: "Goals", n: 2 },
  { id: "treatment", label: "Treatment", n: 3 },
  { id: "plan", label: "Plan", n: 4 },
];
const TERMS = ["Short term", "Long term"];
const EQUIPMENT = ["None", "Chair", "Plinth", "Parallel bars", "Walker/frame", "Cane", "Quad cane", "AFO", "Therapy ball", "Foam pad", "Treadmill", "Other"];
const uid = () => Math.random().toString(36).slice(2, 9);

const chip = (bg, color) => ({ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: bg, color });

function PhaseNav({ phase, setPhase, counts }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto" }}>
      {PHASES.map((p) => {
        const active = phase === p.id;
        const c = counts[p.id];
        return (
          <button key={p.id} type="button" onClick={() => setPhase(p.id)}
            style={{ flex: "1 0 auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
              border: `1.5px solid ${active ? BRAND.purple : BRAND.border}`, background: active ? BRAND.purple : "#fff", color: active ? "#fff" : BRAND.ink, fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap" }}>
            <span style={{ opacity: 0.75 }}>{p.n}</span>{p.label}
            {c > 0 && <span style={{ fontSize: 10.5, fontWeight: 800, padding: "1px 6px", borderRadius: 99, background: active ? "rgba(255,255,255,.25)" : BRAND.purpleFaint, color: active ? "#fff" : BRAND.purpleDark }}>{c}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ─── 1. PROBLEMS ─────────────────────────────────────────── */
function PrecautionsBanner({ condition, setting }) {
  const items = conditionSettingPrecautions(condition, setting);
  if (!items.length) return null;
  const cLabel = conditionLabel(condition);
  const sLabel = settingLabel(setting);
  return (
    <div className="tech-card" style={{ borderColor: "#f59e0b", background: "#fffbeb", marginBottom: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
        ⚠️ {[cLabel, sLabel].filter(Boolean).join(" · ")} precautions
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((t, i) => (
          <div key={i} style={{ fontSize: 11.5, color: "#92400e" }}>• {t}</div>
        ))}
      </div>
    </div>
  );
}

function ProblemsPhase({ suggested, problems, setProblems, onNext, condition, setting }) {
  const [manualOpen, setManualOpen] = useState(false);
  const [mCat, setMCat] = useState("");
  const [mName, setMName] = useState("");
  const chosenIds = new Set(problems.map((p) => p.sourceId || p.id));

  const toggle = (s) => {
    if (chosenIds.has(s.id)) setProblems(problems.filter((p) => (p.sourceId || p.id) !== s.id));
    else setProblems([...problems, { id: uid(), sourceId: s.id, name: s.name, category: s.category, findings: s.findings, baseline: s.baseline, treatmentCategories: s.treatmentCategories, refs: s.refs, evidence: s.evidence, manual: false }]);
  };
  const addManual = () => {
    if (!mName.trim()) return;
    setProblems([...problems, { id: uid(), sourceId: null, name: mName.trim(), category: mCat || "other", findings: [], baseline: {}, treatmentCategories: [], refs: [], evidence: null, manual: true }]);
    setMName(""); setMCat(""); setManualOpen(false);
  };

  return (
    <>
      <SectionIntro icon="🧩" title="Problem list" sub="Suggested from the findings you already recorded — select the ones you want to treat." />
      <PrecautionsBanner condition={condition} setting={setting} />

      {suggested.length === 0 && (
        <div className="summary-empty">No problems could be suggested yet — record findings in the assessment steps (motor, tone, balance, gait, functional) and they'll appear here. You can still add problems manually below.</div>
      )}

      {suggested.map((s) => {
        const on = chosenIds.has(s.id);
        return (
          <div key={s.id} className="tech-card" style={{ borderColor: on ? BRAND.purple : undefined, cursor: "pointer" }} onClick={() => toggle(s)}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, lineHeight: 1.3, color: on ? BRAND.purple : BRAND.gray }}>{on ? "☑" : "☐"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span className="tech-card-title" style={{ fontSize: 13.5 }}>{s.name}</span>
                  <span style={chip(BRAND.purpleFaint, BRAND.purpleDark)}>{categoryLabel(s.category)}</span>
                  {s.evidence && <span style={chip("#ecfdf5", "#047857")}>Evidence {s.evidence}</span>}
                  {s.conditionSpecific && <span style={chip("#fef3c7", "#92400e")}>{conditionLabel(condition)}</span>}
                </div>
                {/* The "why" trail -- the exact recorded values that triggered
                    this suggestion, so the therapist can judge it rather than
                    trust it blindly. */}
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                  {s.findings.map((f, i) => (
                    <div key={i} style={{ fontSize: 11.5, color: BRAND.gray }}>
                      <span style={{ fontWeight: 600 }}>{f.label}:</span> {f.value}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {problems.filter((p) => p.manual).map((p) => (
        <div key={p.id} className="tech-card" style={{ borderColor: BRAND.purple }}>
          <div className="tech-card-head">
            <div className="tech-card-title" style={{ fontSize: 13.5 }}>
              {p.name} <span style={chip(BRAND.purpleFaint, BRAND.purpleDark)}>{categoryLabel(p.category)}</span> <span style={chip("#f1f5f9", "#64748b")}>Manual</span>
            </div>
            <div className="tech-card-actions">
              <button type="button" className="tech-card-del" onClick={() => setProblems(problems.filter((x) => x.id !== p.id))} aria-label="Remove">✕</button>
            </div>
          </div>
        </div>
      ))}

      {!manualOpen ? (
        <button type="button" className="ghost-btn" style={{ width: "100%", marginTop: 10 }} onClick={() => setManualOpen(true)}>＋ Add problem manually</button>
      ) : (
        <div className="tech-card" style={{ marginTop: 10 }}>
          <SelectField label="Category" type="single" options={PROBLEM_CATEGORIES.map((c) => c.label)} value={categoryLabel(mCat)} onChange={(v) => setMCat((PROBLEM_CATEGORIES.find((c) => c.label === v) || {}).id || "other")} />
          <TextField label="Problem" value={mName} onChange={setMName} placeholder="Describe the problem in your own words" />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" className="ghost-btn" style={{ flex: 1 }} onClick={() => { setManualOpen(false); setMName(""); }}>Cancel</button>
            <button type="button" className="primary-btn" style={{ flex: 1 }} disabled={!mName.trim()} onClick={addManual}>Add problem</button>
          </div>
        </div>
      )}

      {problems.length > 0 && (
        <button type="button" className="primary-btn" style={{ width: "100%", marginTop: 16 }} onClick={onNext}>
          Continue to Goals ({problems.length}) →
        </button>
      )}
    </>
  );
}

/* ─── 2. GOALS ────────────────────────────────────────────── */
function GoalEditor({ goal, onChange, onRemove }) {
  return (
    <div className="tech-card" style={{ borderColor: BRAND.purple }}>
      <div className="tech-card-head">
        <div className="tech-card-title" style={{ fontSize: 13 }}>{goal.measure}</div>
        <div className="tech-card-actions">
          <button type="button" className="tech-card-del" onClick={onRemove} aria-label="Remove goal">✕</button>
        </div>
      </div>
      <div className="row-2" style={{ gap: 10, marginTop: 6 }}>
        <TextField label="Current" value={goal.baseline} onChange={(v) => onChange({ ...goal, baseline: v })} />
        <TextField label="Target" value={goal.target} onChange={(v) => onChange({ ...goal, target: v })} />
      </div>
      <Segmented label="Term" options={TERMS} value={goal.term === "short" ? "Short term" : "Long term"} onChange={(v) => onChange({ ...goal, term: v === "Short term" ? "short" : "long" })} />
      <div style={{ marginTop: 6 }}>
        <div className="vital-label-row"><span className="vital-label">Timeframe (weeks)</span></div>
        <Stepper value={String(goal.weeks)} onChange={(v) => onChange({ ...goal, weeks: parseInt(v) || 0 })} min={1} max={52} step={1} square />
      </div>
    </div>
  );
}

function GoalsPhase({ problems, goals, setGoals, onNext, setting }) {
  return (
    <>
      <SectionIntro icon="🎯" title="Goals" sub="Pre-filled from this patient's own recorded values — edit anything. A problem can have both a short-term and a long-term goal." />
      {problems.length === 0 && <div className="summary-empty">Select at least one problem first.</div>}

      {problems.map((p) => {
        const mine = goals.filter((g) => g.problemId === p.id);
        const chosenTemplates = new Set(mine.map((g) => g.templateId).filter(Boolean));
        const suggestions = p.sourceId ? buildGoalsForProblem(p.sourceId, p.baseline, setting).filter((s) => !chosenTemplates.has(s.templateId)) : [];
        return (
          <div key={p.id} style={{ marginBottom: 18 }}>
            <div className="subheading" style={{ marginTop: 10 }}>{p.name}</div>
            {p.findings.length > 0 && (
              <div style={{ fontSize: 11.5, color: BRAND.gray, marginBottom: 8 }}>
                Current: {p.findings.map((f) => `${f.label} ${f.value}`).join(" · ")}
              </div>
            )}

            {mine.map((g) => (
              <GoalEditor key={g.id} goal={g}
                onChange={(next) => setGoals(goals.map((x) => (x.id === g.id ? next : x)))}
                onRemove={() => setGoals(goals.filter((x) => x.id !== g.id))} />
            ))}

            {suggestions.map((s) => (
              <button key={s.templateId} type="button" className="template-row" style={{ width: "100%" }}
                // `...s` must come BEFORE problemId: buildGoalsForProblem()
                // stamps the knowledge-base problem id on each template, and
                // spreading it last silently overwrote the local problem id,
                // breaking every goal->problem lookup (relevant treatment
                // categories, plan grouping).
                onClick={() => setGoals([...goals, { id: uid(), ...s, problemId: p.id }])}>
                <div>
                  <div className="template-row-label">{s.label}</div>
                  <div className="template-row-note">{s.baseline} → {s.target} · {s.weeks} weeks · {s.term === "short" ? "STG" : "LTG"}</div>
                </div>
                <span className="template-row-arrow">+</span>
              </button>
            ))}

            <button type="button" className="ghost-btn" style={{ width: "100%", marginTop: 8 }}
              onClick={() => setGoals([...goals, { id: uid(), problemId: p.id, templateId: null, label: "Custom goal", measure: "Custom goal", unit: "", baseline: "", target: "", term: "short", weeks: 4, baselineValue: null, targetValue: null }])}>
              ＋ Add custom goal
            </button>
          </div>
        );
      })}

      {goals.length > 0 && (
        <button type="button" className="primary-btn" style={{ width: "100%", marginTop: 8 }} onClick={onNext}>
          Continue to Treatment ({goals.length}) →
        </button>
      )}
    </>
  );
}

/* ─── 3. TREATMENT (goal-wise) ────────────────────────────── */
const NEURO_CATS = Object.keys(EXERCISE_DB.neurological.categories);

function AddTreatmentSheet({ goal, allGoals, problemId, relevantCats, existing, onAdd, onClose }) {
  const [cat, setCat] = useState(null);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState(null);
  const [dose, setDose] = useState(null);
  const [linked, setLinked] = useState([goal.id]);

  const all = useMemo(() => Object.entries(EXERCISE_DB.neurological.categories).flatMap(([c, list]) => list.map((e) => ({ ...e, _cat: c }))), []);

  // Ranked, book-referenced suggestions for the problem behind this goal.
  // Each recommendation's exId is resolved to the real exercise here; the
  // note/source come from the knowledge base. Suggestions are shown first
  // but the therapist still opens each to confirm dose -- never auto-added.
  const suggestions = useMemo(() => {
    return recommendInterventions(problemId)
      .map((r) => ({ ...r, ex: all.find((e) => e.id === r.exId) }))
      .filter((r) => r.ex);
  }, [problemId, all]);
  const results = search.trim()
    ? all.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.target.toLowerCase().includes(search.toLowerCase()))
    : cat ? all.filter((e) => e._cat === cat) : [];

  // Categories the problem behind this goal declares as clinically
  // relevant come first; the rest stay available but below.
  const ordered = [...relevantCats.filter((c) => NEURO_CATS.includes(c)), ...NEURO_CATS.filter((c) => !relevantCats.includes(c))];

  const startDose = (ex) => {
    setPicked(ex);
    setDose({ sets: ex.sets, reps: ex.reps, hold: ex.hold, duration: "", assistance: "", equipment: "", freq: ex.freq });
  };

  return (
    <div className="ct-modal">
      <div className="ct-modal-header">
        <div className="ct-modal-title">{picked ? picked.name : "Add treatment"}</div>
        <button type="button" className="ct-modal-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {!picked && (
        <>
          <div style={{ padding: "0 14px", fontSize: 12, color: BRAND.gray }}>For: <b style={{ color: BRAND.ink }}>{goal.measure}</b></div>
          <div className="ct-search-wrap">
            <input className="ct-search" placeholder="🔍 Search treatment..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="ct-modal-body">
            {!search.trim() && !cat && suggestions.length > 0 && (
              <div className="ct-group">
                <div className="ct-group-title" style={{ color: BRAND.purpleDark }}>⭐ SUGGESTED FOR THIS GOAL</div>
                {suggestions.map((r, i) => {
                  const already = existing.has(r.ex.id);
                  return (
                    <button key={r.ex.id} type="button" className="ct-item" onClick={() => (already ? null : startDose(r.ex))} disabled={already}
                      style={{ alignItems: "flex-start", borderLeft: `3px solid ${BRAND.purple}` }}>
                      <span style={{ flex: 1, textAlign: "left" }}>
                        <span style={{ fontWeight: 600 }}>
                          <span style={{ color: BRAND.purple, marginRight: 5 }}>{i + 1}.</span>{r.ex.name}
                          {r.ex.evidence && <span style={{ ...chip("#ecfdf5", "#047857"), marginLeft: 6 }}>{r.ex.evidence}</span>}
                        </span>
                        <span style={{ display: "block", fontSize: 11, color: BRAND.gray, marginTop: 2 }}>{r.note}</span>
                        <span style={{ display: "block", fontSize: 10, color: BRAND.gray, marginTop: 2, fontStyle: "italic" }}>📖 {r.source}</span>
                      </span>
                      <span style={{ color: already ? BRAND.gray : BRAND.purple, fontWeight: 700, fontSize: 12 }}>{already ? "Added" : "＋ Add"}</span>
                    </button>
                  );
                })}
                <div style={{ fontSize: 10.5, color: BRAND.gray, padding: "6px 4px 0" }}>Suggestions only — ranked by evidence. Browse all treatment types below, or search.</div>
              </div>
            )}
            {!search.trim() && !cat && (
              <div className="ct-group">
                <div className="ct-group-title">ALL TREATMENT TYPES</div>
                {ordered.map((c) => (
                  <button key={c} type="button" className="ct-item" onClick={() => setCat(c)}>
                    <span>{c}</span>
                    {relevantCats.includes(c) && <span style={{ ...chip(BRAND.purpleFaint, BRAND.purpleDark), marginLeft: "auto" }}>Suggested</span>}
                  </button>
                ))}
              </div>
            )}
            {(search.trim() || cat) && (
              <div className="ct-group">
                <div className="ct-group-title">
                  {search.trim() ? `RESULTS (${results.length})` : cat}
                  {!search.trim() && <button type="button" onClick={() => setCat(null)} style={{ marginLeft: 8, background: "none", border: "none", color: BRAND.purple, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>← all types</button>}
                </div>
                {results.length === 0 && <div className="summary-empty">No matching treatments.</div>}
                {results.map((e) => {
                  const already = existing.has(e.id);
                  return (
                    <button key={e.id} type="button" className="ct-item" onClick={() => (already ? null : startDose(e))} disabled={already}>
                      <span style={{ flex: 1, textAlign: "left" }}>
                        <span style={{ fontWeight: 600 }}>{e.name}</span>
                        <span style={{ display: "block", fontSize: 11, color: BRAND.gray }}>{e.target}</span>
                      </span>
                      <span style={{ color: already ? BRAND.gray : BRAND.purple, fontWeight: 700, fontSize: 12 }}>{already ? "Added" : "＋ Add"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {picked && dose && (
        <>
          <div className="ct-modal-body">
            <div style={{ fontSize: 12, color: BRAND.gray, marginBottom: 10 }}>{picked.target}</div>
            <div className="subheading">Dose</div>
            <div className="row-2" style={{ flexWrap: "wrap", gap: 12 }}>
              <div className="vital-field"><div className="vital-label-row"><span className="vital-label">Sets</span></div><Stepper value={String(dose.sets ?? "")} onChange={(v) => setDose({ ...dose, sets: v })} min={0} max={20} square /></div>
              <div className="vital-field"><div className="vital-label-row"><span className="vital-label">Reps</span></div><Stepper value={String(dose.reps ?? "")} onChange={(v) => setDose({ ...dose, reps: v })} min={0} max={60} square /></div>
              <div className="vital-field"><div className="vital-label-row"><span className="vital-label">Hold (s)</span></div><Stepper value={String(dose.hold ?? "")} onChange={(v) => setDose({ ...dose, hold: v })} min={0} max={600} square /></div>
            </div>
            <TextField label="Duration (optional)" value={dose.duration} onChange={(v) => setDose({ ...dose, duration: v })} placeholder="e.g. 10 min" />
            <SelectField label="Assistance" type="single" options={ASSIST_LADDER} value={dose.assistance} onChange={(v) => setDose({ ...dose, assistance: v })} />
            <SelectField label="Equipment" type="single" options={EQUIPMENT} value={dose.equipment} onChange={(v) => setDose({ ...dose, equipment: v })} />
            <TextField label="Frequency" value={dose.freq} onChange={(v) => setDose({ ...dose, freq: v })} placeholder="e.g. 3 × / week" />

            {/* One treatment, many goals -- avoids creating a duplicate
                record of the same intervention per goal. */}
            <div className="subheading" style={{ marginTop: 14 }}>Add to goal(s)</div>
            {allGoals.map((g) => {
              const on = linked.includes(g.id);
              return (
                <button key={g.id} type="button" className={"ct-item" + (on ? " ct-item-checked" : "")} onClick={() => setLinked(on ? linked.filter((x) => x !== g.id) : [...linked, g.id])}>
                  <span className="ct-checkbox">{on ? "☑" : "☐"}</span>
                  <span style={{ textAlign: "left" }}>{g.measure} <span style={{ color: BRAND.gray, fontSize: 11 }}>({g.baseline} → {g.target})</span></span>
                </button>
              );
            })}
          </div>
          <div className="ct-modal-footer" style={{ display: "flex", gap: 8 }}>
            <button type="button" className="ghost-btn" style={{ flex: 1 }} onClick={() => { setPicked(null); setDose(null); }}>Back</button>
            <button type="button" className="primary-btn" style={{ flex: 2 }} disabled={!linked.length}
              onClick={() => onAdd({ id: uid(), exerciseId: picked.id, name: picked.name, category: picked._cat, ...dose, goalIds: linked })}>
              Add to plan
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function doseLine(t) {
  const parts = [];
  if (t.sets && t.reps) parts.push(`${t.sets} × ${t.reps}`);
  else if (t.reps) parts.push(`${t.reps} reps`);
  if (t.hold) parts.push(`hold ${t.hold}s`);
  if (t.duration) parts.push(t.duration);
  if (t.equipment && t.equipment !== "None") parts.push(t.equipment);
  if (t.assistance) parts.push(t.assistance);
  if (t.freq) parts.push(t.freq);
  return parts.join(" • ");
}

function TreatmentPhase({ problems, goals, treatments, setTreatments, onNext }) {
  const [sheetGoal, setSheetGoal] = useState(null);
  if (!goals.length) return <><SectionIntro icon="🏋" title="Treatment" /><div className="summary-empty">Add at least one goal first.</div></>;

  return (
    <>
      <SectionIntro icon="🏋" title="Treatment" sub="Add treatments under the goal they're meant to achieve. One treatment can serve several goals — it stays a single record." />
      {goals.map((g) => {
        const p = problems.find((x) => x.id === g.problemId);
        const mine = treatments.filter((t) => t.goalIds.includes(g.id));
        return (
          <div key={g.id} style={{ marginBottom: 18 }}>
            <div className="subheading" style={{ marginTop: 10 }}>{g.measure}</div>
            <div style={{ fontSize: 11.5, color: BRAND.gray, marginBottom: 8 }}>
              {g.baseline} → {g.target} · {g.weeks} weeks · {g.term === "short" ? "Short term" : "Long term"}
            </div>
            {mine.map((t) => (
              <div key={t.id} className="tech-card">
                <div className="tech-card-head">
                  <div className="tech-card-title" style={{ fontSize: 13 }}>{t.name}</div>
                  <div className="tech-card-actions">
                    <button type="button" className="tech-card-del"
                      onClick={() => {
                        // Unlink from THIS goal only; the treatment record
                        // survives while any other goal still uses it.
                        const rest = t.goalIds.filter((id) => id !== g.id);
                        setTreatments(rest.length ? treatments.map((x) => (x.id === t.id ? { ...x, goalIds: rest } : x)) : treatments.filter((x) => x.id !== t.id));
                      }} aria-label="Remove from this goal">✕</button>
                  </div>
                </div>
                <div className="tech-card-meta">{doseLine(t)}</div>
                {t.goalIds.length > 1 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: BRAND.purpleDark }}>
                    Also serving {t.goalIds.length - 1} other goal{t.goalIds.length > 2 ? "s" : ""}
                  </div>
                )}
              </div>
            ))}
            <button type="button" className="ghost-btn" style={{ width: "100%", marginTop: 8 }} onClick={() => setSheetGoal(g)}>＋ Add treatment</button>
          </div>
        );
      })}

      {treatments.length > 0 && (
        <button type="button" className="primary-btn" style={{ width: "100%", marginTop: 8 }} onClick={onNext}>Review treatment plan →</button>
      )}

      {sheetGoal && (
        <AddTreatmentSheet
          goal={sheetGoal}
          allGoals={goals}
          problemId={(problems.find((p) => p.id === sheetGoal.problemId) || {}).sourceId || null}
          relevantCats={(problems.find((p) => p.id === sheetGoal.problemId) || {}).treatmentCategories || []}
          existing={new Set(treatments.filter((t) => t.goalIds.includes(sheetGoal.id)).map((t) => t.exerciseId))}
          onAdd={(t) => {
            // If this exercise is already in the plan (added under another
            // goal), just link the existing record to this goal too.
            const dup = treatments.find((x) => x.exerciseId === t.exerciseId);
            if (dup) setTreatments(treatments.map((x) => (x.id === dup.id ? { ...x, goalIds: [...new Set([...x.goalIds, ...t.goalIds])] } : x)));
            else setTreatments([...treatments, t]);
            setSheetGoal(null);
          }}
          onClose={() => setSheetGoal(null)}
        />
      )}
    </>
  );
}

/* ─── 4. PLAN OVERVIEW ────────────────────────────────────── */
function PlanPhase({ problems, goals, treatments }) {
  const usedRefs = [...new Set(problems.flatMap((p) => p.refs || []))];
  return (
    <>
      <SectionIntro icon="📋" title="Treatment plan" sub="What you intend to do. Sessions record what actually happened." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(70px,1fr))", gap: 8, marginBottom: 16 }}>
        {[["Problems", problems.length], ["Goals", goals.length], ["Treatments", treatments.length]].map(([l, v]) => (
          <div key={l} style={{ background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: BRAND.purpleDark }}>{v}</div>
            <div style={{ fontSize: 10.5, color: BRAND.gray, fontWeight: 600 }}>{l}</div>
          </div>
        ))}
      </div>

      {goals.length === 0 && <div className="summary-empty">Nothing planned yet.</div>}
      {goals.map((g) => {
        const p = problems.find((x) => x.id === g.problemId);
        const mine = treatments.filter((t) => t.goalIds.includes(g.id));
        return (
          <div key={g.id} className="summary-card" style={{ cursor: "default" }}>
            <div className="summary-title">🎯 {g.measure}</div>
            <div style={{ fontSize: 11.5, color: BRAND.gray, marginBottom: 8 }}>
              {p ? `${p.name} · ` : ""}{g.baseline} → {g.target} · {g.weeks} weeks · {g.term === "short" ? "STG" : "LTG"}
            </div>
            {mine.length === 0 && <div style={{ fontSize: 12, color: BRAND.grayLight, fontStyle: "italic" }}>No treatments added for this goal.</div>}
            {mine.map((t) => (
              <div key={t.id} className="summary-row">
                <span className="summary-key">{t.name}</span>
                <span className="summary-val">{doseLine(t)}</span>
              </div>
            ))}
          </div>
        );
      })}

      {usedRefs.length > 0 && (
        <div style={{ marginTop: 16, padding: "10px 12px", background: "#f8fafc", border: `1px solid ${BRAND.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: BRAND.gray, letterSpacing: 0.5, marginBottom: 6 }}>CLINICAL REFERENCES</div>
          {usedRefs.map((r) => REFERENCES[r] && (
            <div key={r} style={{ fontSize: 10.5, color: BRAND.gray, lineHeight: 1.5, marginBottom: 4 }}>{REFERENCES[r].citation}</div>
          ))}
          <div style={{ fontSize: 10, color: BRAND.grayLight, marginTop: 4, fontStyle: "italic" }}>
            Suggestions are decision support only — the treating therapist remains responsible for all clinical decisions.
          </div>
        </div>
      )}
    </>
  );
}

/* ─── ROOT ────────────────────────────────────────────────── */
export function NeuroCarePlanSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "neuroCarePlan");
  const problems = Array.isArray(d.problems) ? d.problems : [];
  const goals = Array.isArray(d.goals) ? d.goals : [];
  const treatments = Array.isArray(d.treatments) ? d.treatments : [];
  const [phase, setPhase] = useState("problems");

  // Recomputed from the live assessment data every render, so editing an
  // assessment value immediately changes what's suggested here.
  const suggested = useMemo(() => deriveNeuroProblems(data), [data]);
  const condition = data.meta?.condition || null;
  const setting = data.meta?.setting || null;

  // Keep an already-selected (auto-derived) problem's findings/baseline in
  // step with the assessment. Without this, selecting a problem froze its
  // baseline, so a value recorded afterwards (e.g. adding walking distance
  // once the problem was already ticked) could never reach the goal
  // suggestions. Goals are deliberately NOT re-synced: once a goal exists
  // its baseline is a point-in-time clinical record and must not move
  // under the therapist. Manual problems have no derived source to sync.
  useEffect(() => {
    if (!problems.length) return;
    let changed = false;
    const next = problems.map((p) => {
      if (!p.sourceId) return p;
      const s = suggested.find((x) => x.id === p.sourceId);
      if (!s || JSON.stringify(s.findings) === JSON.stringify(p.findings)) return p;
      changed = true;
      return { ...p, findings: s.findings, baseline: s.baseline };
    });
    if (changed) set("problems", next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested]);

  return (
    <>
      <PhaseNav phase={phase} setPhase={setPhase} counts={{ problems: problems.length, goals: goals.length, treatment: treatments.length, plan: 0 }} />
      {phase === "problems" && <ProblemsPhase suggested={suggested} problems={problems} setProblems={(v) => set("problems", v)} onNext={() => setPhase("goals")} condition={condition} setting={setting} />}
      {phase === "goals" && <GoalsPhase problems={problems} goals={goals} setGoals={(v) => set("goals", v)} onNext={() => setPhase("treatment")} setting={setting} />}
      {phase === "treatment" && <TreatmentPhase problems={problems} goals={goals} treatments={treatments} setTreatments={(v) => set("treatments", v)} onNext={() => setPhase("plan")} />}
      {phase === "plan" && <PlanPhase problems={problems} goals={goals} treatments={treatments} />}
    </>
  );
}

/* formatters[stepId] contract for NeurologicalAssessment.jsx's
   SummarySection — one row per goal with its linked treatments. */
export function formatNeuroCarePlanSection(section) {
  const goals = Array.isArray(section.goals) ? section.goals : [];
  const treatments = Array.isArray(section.treatments) ? section.treatments : [];
  if (!goals.length) return [];
  return goals.map((g) => {
    const mine = treatments.filter((t) => (t.goalIds || []).includes(g.id));
    const tx = mine.length ? ` — ${mine.map((t) => t.name).join(", ")}` : "";
    return { label: g.measure, value: `${g.baseline} → ${g.target} (${g.weeks}w, ${g.term === "short" ? "STG" : "LTG"})${tx}` };
  });
}

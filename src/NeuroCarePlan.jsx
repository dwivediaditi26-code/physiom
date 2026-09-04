import React, { useState, useMemo, useEffect } from "react";
import { SectionIntro, TextField, TextArea, SelectField, Segmented, Stepper, useSectionData, BRAND } from "./orthoFieldKit.jsx";
import { EXERCISE_DB } from "./sharedClinicalData.js";
import {
  deriveNeuroProblems, buildGoalsForProblem, PROBLEM_CATEGORIES, categoryLabel,
  REFERENCES, ASSIST_LADDER, problemById,
  conditionLabel, settingLabel, conditionSettingPrecautions,
  recommendInterventions, goalProgress,
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

   Stored under data.neuroCarePlan = { problems[], goals[], treatments[],
   sessions[] }. Sessions record what actually happened (seeded from the
   plan), and Progress is derived from session measures via goalProgress()
   — no separate progress documentation.
   ============================================================ */

const PHASES = [
  { id: "problems", label: "Problems", n: 1 },
  { id: "goals", label: "Goals", n: 2 },
  { id: "treatment", label: "Treatment", n: 3 },
  { id: "plan", label: "Plan", n: 4 },
  { id: "sessions", label: "Sessions", n: 5 },
  { id: "progress", label: "Progress", n: 6 },
];
const TERMS = ["Short term", "Long term"];
const EQUIPMENT = ["None", "Chair", "Plinth", "Parallel bars", "Walker/frame", "Cane", "Quad cane", "AFO", "Therapy ball", "Foam pad", "Treadmill", "Other"];
const uid = () => Math.random().toString(36).slice(2, 9);

// Defensive: a finding value must render as text. Current data stores
// strings, but legacy records can carry an object (e.g. per-limb tone maps);
// coerce anything non-scalar so a stray shape can never crash the Care Plan.
const renderVal = (v) => (v == null ? "" : typeof v === "object" ? Object.values(v).filter(Boolean).join(", ") : String(v));

const chip = (bg, color) => ({ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: bg, color });

// Bottom CTA so "Continue"/"Review" is always reachable without scrolling to
// the end of a long list (2026-09-03, Aditi: "make it like static in screen").
// When the Care Plan is embedded in the patient profile (floatingCTA), the CTA
// is a FIXED bar floating above the app's ~64px bottom nav — sticky can't do
// this for a last-child element (nothing below it to stick against). In the
// assessment wizard (no floatingCTA) it stays in normal flow so it never
// overlaps the wizard's own Back/Next footer.
const FLOATING_CTA = { position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 74, width: "min(680px, calc(100vw - 28px))", zIndex: 40, marginTop: 0, boxShadow: "0 8px 26px rgba(109,40,217,0.42)" };
const ctaStyle = (floating, base) => (floating ? { ...base, ...FLOATING_CTA } : base);
// Extra bottom padding so the last card isn't hidden behind the fixed bar.
const FLOATING_PAD = { paddingBottom: 84 };

function PhaseNav({ phase, setPhase, counts }) {
  return (
    <div className="cp-scroll-x" style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
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

function ProblemsPhase({ suggested, problems, setProblems, onNext, condition, setting, floatingCTA }) {
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
                  {s.settingSpecific && <span style={chip("#e0f2fe", "#075985")}>{settingLabel(setting)}</span>}
                </div>
                {/* The "why" trail -- the exact recorded values that triggered
                    this suggestion, so the therapist can judge it rather than
                    trust it blindly. */}
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                  {s.findings.map((f, i) => (
                    <div key={i} style={{ fontSize: 11.5, color: BRAND.gray }}>
                      <span style={{ fontWeight: 600 }}>{f.label}:</span> {renderVal(f.value)}
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
        <button type="button" className="primary-btn" style={ctaStyle(floatingCTA, { width: "100%", marginTop: 16 })} onClick={onNext}>
          Continue to Goals ({problems.length}) →
        </button>
      )}
    </>
  );
}

/* ─── 2. GOALS ────────────────────────────────────────────── */
function GoalEditor({ goal, onChange, onRemove }) {
  // Compact by default: a one-line summary row; tap Edit to expand the fields
  // (2026-09-03, Aditi: "make it small and compact ... more small goal").
  const [open, setOpen] = useState(false);
  return (
    <div className="tech-card" style={{ borderColor: BRAND.purple, padding: "8px 10px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{goal.measure}</div>
          <div style={{ fontSize: 11, color: BRAND.gray, marginTop: 1 }}>{goal.baseline} → {goal.target} · {goal.term === "short" ? "STG" : "LTG"} · {goal.weeks}w</div>
        </div>
        <button type="button" className="ghost-btn" style={{ padding: "4px 10px", fontSize: 11, flexShrink: 0 }} onClick={() => setOpen((o) => !o)}>{open ? "Done" : "Edit"}</button>
        <button type="button" className="tech-card-del" onClick={onRemove} aria-label="Remove goal" style={{ flexShrink: 0 }}>✕</button>
      </div>
      {open && (
        <>
          <div className="row-2" style={{ gap: 8, marginTop: 8 }}>
            <TextField label="Current" value={goal.baseline} onChange={(v) => onChange({ ...goal, baseline: v })} />
            <TextField label="Target" value={goal.target} onChange={(v) => onChange({ ...goal, target: v })} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginTop: 6, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 150px", minWidth: 0 }}>
              <Segmented label="Term" options={TERMS} value={goal.term === "short" ? "Short term" : "Long term"} onChange={(v) => onChange({ ...goal, term: v === "Short term" ? "short" : "long" })} />
            </div>
            <div style={{ flex: "0 0 auto" }}>
              <div className="vital-label-row"><span className="vital-label">Weeks</span></div>
              <Stepper value={String(goal.weeks)} onChange={(v) => onChange({ ...goal, weeks: parseInt(v) || 0 })} min={1} max={52} step={1} square />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GoalsPhase({ problems, goals, setGoals, onNext, setting, floatingCTA }) {
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
                Current: {p.findings.map((f) => `${f.label} ${renderVal(f.value)}`).join(" · ")}
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
        <button type="button" className="primary-btn" style={ctaStyle(floatingCTA, { width: "100%", marginTop: 8 })} onClick={onNext}>
          Continue to Treatment ({goals.length}) →
        </button>
      )}
    </>
  );
}

/* ─── 3. TREATMENT (goal-wise) ────────────────────────────── */
const NEURO_CATS = Object.keys(EXERCISE_DB.neurological.categories);

function AddTreatmentSheet({ goal, allGoals, problemId, relevantCats, existing, onAdd, onClose, fullScreen }) {
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
    <div className="ct-modal" style={fullScreen ? { position: "fixed", inset: 0, zIndex: 3000 } : undefined}>
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

function TreatmentPhase({ problems, goals, treatments, setTreatments, onNext, floatingCTA }) {
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
        <button type="button" className="primary-btn" style={ctaStyle(floatingCTA, { width: "100%", marginTop: 8 })} onClick={onNext}>Review treatment plan →</button>
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
          fullScreen={floatingCTA}
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

/* ─── 5. SESSIONS (record what actually happened) ─────────── */
const todayISO = () => new Date().toISOString().slice(0, 10);

// A new session is seeded straight from the Treatment Plan (2026-09-03,
// Aditi: "Sessions ... seeded from the plan"). Every planned treatment
// starts ticked 'done' with its planned dose pre-filled as the actual;
// the therapist only edits the exceptions.
function newSessionDraft(treatments, no) {
  return {
    id: uid(),
    no,
    date: todayISO(),
    items: treatments.map((t) => ({ treatmentId: t.id, done: true, actual: doseLine(t), note: "" })),
    measures: {},
    note: "",
  };
}

function SessionEditor({ draft, setDraft, treatments, goals, onSave, onCancel }) {
  const setItem = (tid, patch) => setDraft({ ...draft, items: draft.items.map((it) => (it.treatmentId === tid ? { ...it, ...patch } : it)) });
  const doneCount = draft.items.filter((it) => it.done).length;
  return (
    <div className="tech-card" style={{ borderColor: BRAND.purple }}>
      <div className="row-2" style={{ gap: 10 }}>
        <div>
          <div className="vital-label-row"><span className="vital-label">Session #</span></div>
          <div style={{ fontSize: 18, fontWeight: 900, color: BRAND.purpleDark }}>{draft.no}</div>
        </div>
        <TextField label="Date" value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} placeholder="YYYY-MM-DD" />
      </div>

      <div className="subheading" style={{ marginTop: 12 }}>Today's treatment (from plan) · {doneCount}/{draft.items.length} done</div>
      {draft.items.length === 0 && <div className="summary-empty">No treatments in the plan yet — add some in the Treatment phase.</div>}
      {draft.items.map((it) => {
        const t = treatments.find((x) => x.id === it.treatmentId);
        if (!t) return null;
        return (
          <div key={it.treatmentId} className="tech-card" style={{ marginTop: 8, borderColor: it.done ? BRAND.purple : BRAND.border }}>
            <button type="button" className="ct-item" style={{ padding: 0 }} onClick={() => setItem(it.treatmentId, { done: !it.done })}>
              <span className="ct-checkbox">{it.done ? "☑" : "☐"}</span>
              <span style={{ textAlign: "left", flex: 1 }}>
                <span style={{ fontWeight: 600, textDecoration: it.done ? "none" : "line-through", color: it.done ? BRAND.ink : BRAND.gray }}>{t.name}</span>
                <span style={{ display: "block", fontSize: 11, color: BRAND.gray }}>Planned: {doseLine(t) || "—"}</span>
              </span>
            </button>
            {it.done && (
              <div style={{ marginTop: 6 }}>
                <TextField label="Actual" value={it.actual} onChange={(v) => setItem(it.treatmentId, { actual: v })} placeholder="what you actually did" />
                <TextField label="Note (optional)" value={it.note} onChange={(v) => setItem(it.treatmentId, { note: v })} placeholder="e.g. fatigued, reduced reps" />
              </div>
            )}
          </div>
        );
      })}

      {goals.length > 0 && (
        <>
          <div className="subheading" style={{ marginTop: 14 }}>Record a measure (optional) — feeds Progress</div>
          {goals.map((g) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              <span style={{ flex: 1, fontSize: 12.5 }}>{g.measure} <span style={{ color: BRAND.gray, fontSize: 11 }}>({g.baseline} → {g.target})</span></span>
              <div style={{ width: 90 }}>
                <TextField label="" value={draft.measures[g.id] ?? ""} onChange={(v) => setDraft({ ...draft, measures: { ...draft.measures, [g.id]: v } })} placeholder={g.unit || "value"} />
              </div>
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: 12 }}>
        <TextArea label="Session note" value={draft.note} onChange={(v) => setDraft({ ...draft, note: v })} placeholder="Overall note for this session" />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" className="ghost-btn" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
        <button type="button" className="primary-btn" style={{ flex: 2 }} onClick={onSave}>Save session</button>
      </div>
    </div>
  );
}

function SessionsPhase({ treatments, goals, sessions, setSessions }) {
  const [draft, setDraft] = useState(null);
  const ordered = [...sessions].sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.no - a.no);

  const startNew = () => setDraft(newSessionDraft(treatments, sessions.length + 1));
  const save = () => {
    const exists = sessions.some((s) => s.id === draft.id);
    setSessions(exists ? sessions.map((s) => (s.id === draft.id ? draft : s)) : [...sessions, draft]);
    setDraft(null);
  };

  return (
    <>
      <SectionIntro icon="🗓" title="Sessions" sub="Record what actually happened. Each session is seeded from the treatment plan — just adjust Planned vs Actual." />

      {draft ? (
        <SessionEditor draft={draft} setDraft={setDraft} treatments={treatments} goals={goals} onSave={save} onCancel={() => setDraft(null)} />
      ) : (
        <>
          <button type="button" className="primary-btn" style={{ width: "100%", marginBottom: 14 }} onClick={startNew}>＋ New session</button>
          {ordered.length === 0 && <div className="summary-empty">No sessions recorded yet. Tap “New session” to record today's visit.</div>}
          {ordered.map((s) => {
            const done = s.items.filter((it) => it.done).length;
            const measured = Object.values(s.measures || {}).filter((v) => v !== "" && v != null).length;
            return (
              <div key={s.id} className="summary-card" style={{ cursor: "pointer" }} onClick={() => setDraft(s)}>
                <div className="summary-title">Session {s.no} · {s.date}</div>
                <div style={{ fontSize: 11.5, color: BRAND.gray, marginTop: 2 }}>
                  {done}/{s.items.length} treatments done{measured ? ` · ${measured} measure${measured > 1 ? "s" : ""} recorded` : ""}
                </div>
                {s.note && <div style={{ fontSize: 11.5, color: BRAND.gray, marginTop: 4, fontStyle: "italic" }}>{s.note}</div>}
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

/* ─── 6. PROGRESS (derived from session data, no extra typing) ─ */
function entriesForGoal(sessions, goalId) {
  return sessions
    .map((s) => ({ sessionNo: s.no, date: s.date, value: parseFloat(s.measures?.[goalId]) }))
    .filter((e) => Number.isFinite(e.value))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

function ProgressPhase({ goals, sessions }) {
  return (
    <>
      <SectionIntro icon="📈" title="Progress" sub="Derived automatically from your session data — no separate progress notes needed." />
      {goals.length === 0 && <div className="summary-empty">No goals yet. Progress is calculated from the goals you set and the measures you record in sessions.</div>}
      {goals.map((g) => {
        const entries = entriesForGoal(sessions, g.id);
        const prog = goalProgress(g, entries);
        const hasPct = prog.pct != null;
        return (
          <div key={g.id} className="summary-card" style={{ cursor: "default" }}>
            <div className="summary-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              🎯 {g.measure}
              {prog.achieved && <span style={chip("#ecfdf5", "#047857")}>Achieved</span>}
            </div>
            <div style={{ fontSize: 11.5, color: BRAND.gray, margin: "2px 0 8px" }}>
              {g.baseline} → {g.target} · {g.term === "short" ? "STG" : "LTG"} · {g.weeks}w
            </div>
            {hasPct ? (
              <>
                <div style={{ height: 10, background: "#eef2f7", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${prog.pct}%`, height: "100%", background: prog.achieved ? "#10b981" : BRAND.purple, transition: "width .3s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11 }}>
                  <span style={{ color: BRAND.gray }}>latest: <b style={{ color: BRAND.ink }}>{prog.latest}</b> {g.unit || ""} · {entries.length} data point{entries.length > 1 ? "s" : ""}</span>
                  <span style={{ fontWeight: 800, color: prog.achieved ? "#047857" : BRAND.purpleDark }}>{prog.pct}%</span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11.5, color: BRAND.grayLight, fontStyle: "italic" }}>
                {entries.length === 0 ? "Record this goal's measure in a session to track progress." : `Latest value: ${prog.latest} — set a numeric baseline/target for an automatic % (this goal's target isn't numeric).`}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ─── ROOT ────────────────────────────────────────────────── */
export function NeuroCarePlanSection({ data, setData, initialPhase, floatingCTA }) {
  const [d, set] = useSectionData(data, setData, "neuroCarePlan");
  const problems = Array.isArray(d.problems) ? d.problems : [];
  const goals = Array.isArray(d.goals) ? d.goals : [];
  const treatments = Array.isArray(d.treatments) ? d.treatments : [];
  const sessions = Array.isArray(d.sessions) ? d.sessions : [];
  const [phase, setPhase] = useState(initialPhase || "problems");

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
      {/* Hide the horizontal scrollbar on scrollable rows — cleaner look
          (2026-09-03, Aditi: "this grey sliding thing i dont like"). */}
      <style>{`.cp-scroll-x::-webkit-scrollbar{display:none}`}</style>
      <PhaseNav phase={phase} setPhase={setPhase} counts={{ problems: problems.length, goals: goals.length, treatment: treatments.length, plan: 0, sessions: sessions.length, progress: 0 }} />
      {phase === "problems" && <ProblemsPhase suggested={suggested} problems={problems} setProblems={(v) => set("problems", v)} onNext={() => setPhase("goals")} condition={condition} setting={setting} floatingCTA={floatingCTA} />}
      {phase === "goals" && <GoalsPhase problems={problems} goals={goals} setGoals={(v) => set("goals", v)} onNext={() => setPhase("treatment")} setting={setting} floatingCTA={floatingCTA} />}
      {phase === "treatment" && <TreatmentPhase problems={problems} goals={goals} treatments={treatments} setTreatments={(v) => set("treatments", v)} onNext={() => setPhase("plan")} floatingCTA={floatingCTA} />}
      {phase === "plan" && <PlanPhase problems={problems} goals={goals} treatments={treatments} />}
      {phase === "sessions" && <SessionsPhase treatments={treatments} goals={goals} sessions={sessions} setSessions={(v) => set("sessions", v)} />}
      {phase === "progress" && <ProgressPhase goals={goals} sessions={sessions} />}
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

import React, { useState, useMemo, useEffect, useRef, createContext, useContext } from "react";
import { SectionIntro, TextField, TextArea, SelectField, Segmented, Stepper, useSectionData, BRAND, InfoButton } from "./orthoFieldKit.jsx";
import { EXERCISE_DB } from "./sharedClinicalData.js";
import { exerciseRichItem } from "./exerciseCardKit.jsx";
import { TECHNIQUE_TYPES, BLANK_TECHNIQUE, techniqueEntryForm, techniqueLabel } from "./orthoOutpatientSections.jsx";
import { EvidenceProtocolBrowser } from "./orthoEvidenceProtocols.jsx";
import { listClinicProtocols, saveClinicProtocol } from "./clinicProtocols.js";
import {
  deriveNeuroProblems, buildGoalsForProblem, PROBLEM_CATEGORIES, categoryLabel,
  REFERENCES, ASSIST_LADDER, problemById,
  conditionLabel, settingLabel, conditionSettingPrecautions,
  recommendInterventions, goalProgress,
} from "./neuroClinicalKnowledge.js";

/* ============================================================
   KNOWLEDGE INJECTION (2026-09-04) — the Care Plan UI is shared
   between specialties; only the clinical knowledge changes (Aditi:
   "ui will be same as neuro but main knowledge is changed"). The root
   CarePlanSection takes a `knowledge` module and provides it through
   context so every phase uses the right specialty's rules engine,
   references, categories and exercise library. NeuroCarePlanSection is
   a thin wrapper supplying the neuro knowledge; OrthoCarePlanSection
   (orthoClinicalKnowledge.js) supplies ortho's — identical UX.

   A `knowledge` object provides:
     deriveProblems(data) buildGoalsForProblem(id,baseline,setting)
     recommendInterventions(problemId) problemById(id) categoryLabel(id)
     PROBLEM_CATEGORIES REFERENCES ASSIST_LADDER goalProgress(goal,entries)
     conditionLabel(id) settingLabel(id) conditionSettingPrecautions(c,s)
     exerciseCategories  // { [categoryName]: [exercise,...] }
   ============================================================ */
const KBContext = createContext(null);
const useKB = () => useContext(KBContext);

// The neuro knowledge module, packaged for injection. Ortho supplies its
// own object of the same shape.
export const NEURO_KNOWLEDGE = {
  deriveProblems: deriveNeuroProblems,
  buildGoalsForProblem, recommendInterventions, problemById, categoryLabel,
  PROBLEM_CATEGORIES, REFERENCES, ASSIST_LADDER, goalProgress,
  conditionLabel, settingLabel, conditionSettingPrecautions,
  exerciseCategories: EXERCISE_DB.neurological.categories,
};

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
// Manual treatment / modality quick-picks reuse TECHNIQUE_TYPES and its
// entry form verbatim from the ortho assessment's own "Treatment
// Techniques" step (2026-09-09, Aditi: it "opens but not the original
// way" — the Care Plan's technique picker only collected sets/reps/hold,
// dropping the type-specific fields — Maitland grade, DN muscle/needles,
// taping pattern, US frequency, etc. — the wizard's step captures).
const uid = () => Math.random().toString(36).slice(2, 9);
// Sentinel `cat` value for the Add Treatment panel's "All" tile (2026-09-16,
// Aditi: treatment-type tiles first, not a flat category list) -- distinct
// from a real category name so `cat === ALL_TYPES` unambiguously means
// "every category", same idea as Exercise Prescription's own "All" tile.
const ALL_TYPES = "__all__";

// Defensive: a finding value must render as text. Current data stores
// strings, but legacy records can carry an object (e.g. per-limb tone maps);
// coerce anything non-scalar so a stray shape can never crash the Care Plan.
const renderVal = (v) => (v == null ? "" : typeof v === "object" ? Object.values(v).filter(Boolean).join(", ") : String(v));

const chip = (bg, color) => ({ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: bg, color });

// Bottom CTA so "Continue"/"Review" is always reachable without scrolling to
// the end of a long list (2026-09-03, Aditi: "make it like static in
// screen"; 2026-09-16, Aditi: "when we on goal or problem list page and add
// to plan we have to scroll down to add to the plan... make it constant").
// When the Care Plan is embedded in the patient profile (floatingCTA), the CTA
// is a FIXED bar floating above the app's ~64px bottom nav — sticky can't do
// this for a last-child element (nothing below it to stick against). In the
// assessment wizard (no floatingCTA) it floats the same way, just above the
// wizard's OWN fixed Back/Next bar (.bottombar, orthoStyles.js: bottom 60px
// + ~70px of its own height) instead of the app's bottom nav, so it never
// overlaps that footer.
// bottom uses calc(...) rather than a plain number because .pm-bnav (the
// bottom nav in utils.jsx) now carries padding-bottom: env(safe-area-inset-
// bottom) for the iOS home-indicator safe area, making it taller on notched
// devices -- this offset must grow by the same amount or the CTA sits
// behind the nav bar instead of above it.
// bottom/left/width read the shared screen-tier variables (utils.jsx) instead
// of a phone-only 74px/50%/100vw guess: --pm-bnav-h is the bottom nav's real
// height (0 on a laptop, where there is no bottom nav), --pm-side-w the 210px
// laptop sidebar the wizard column is centred beside, --pm-col-w the wizard
// column width (2026-09-18, tablet/laptop pass -- on a laptop this bar was
// floating ~70px above the wizard's Back/Next bar, centred on the window
// rather than on the wizard column).
const FLOATING_CTA = { position: "fixed", left: "calc(50% + var(--pm-side-w, 0px) / 2)", transform: "translateX(-50%)", bottom: "calc(var(--pm-bnav-h, calc(59px + env(safe-area-inset-bottom))) + 15px)", width: "min(calc(var(--pm-col-w, 480px) - 20px), calc(100vw - var(--pm-side-w, 0px) - 28px))", zIndex: 40, marginTop: 0, boxShadow: "0 8px 26px rgba(109,40,217,0.42)" };
// .bottombar (orthoStyles.js) itself grows with the safe area TWICE over --
// once in its own `bottom: calc(60px + env(safe-area-inset-bottom))` offset,
// again in its `padding-bottom: calc(12px + env(safe-area-inset-bottom))` --
// so its real top edge is `131px + 2 * env(safe-area-inset-bottom)`, not the
// single safe-area term this used before. On a real notched iPhone (2026-
// 09-16, Aditi: screenshot showing "Continue to Goals" sitting on top of the
// wizard's own Back/Next bar) that missing second term was ~34px short,
// enough to visibly overlap; a desktop/no-notch preview has safe-area 0 so
// the bug never showed there.
const FLOATING_CTA_WIZARD = { ...FLOATING_CTA, bottom: "calc(var(--pm-bnav-h, calc(59px + env(safe-area-inset-bottom))) + 84px + env(safe-area-inset-bottom))" };
const ctaStyle = (floating, base) => ({ ...base, ...(floating ? FLOATING_CTA : FLOATING_CTA_WIZARD) });
// Extra bottom padding so the last card isn't hidden behind the fixed bar.
const FLOATING_PAD = { paddingBottom: 84 };

function PhaseNav({ phase, setPhase, counts, phases }) {
  const shown = phases ? PHASES.filter((p) => phases.includes(p.id)) : PHASES;
  return (
    <div className="cp-scroll-x" style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
      {shown.map((p) => {
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
  const kb = useKB();
  const items = kb.conditionSettingPrecautions(condition, setting);
  if (!items.length) return null;
  const cLabel = kb.conditionLabel(condition);
  const sLabel = kb.settingLabel(setting);
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

// Compact card for an already-selected problem -- the Problem List phase's
// default view (2026-09-18, Aditi: "I just want to see what problems I
// have selected without opening the whole problem list"). Works for both
// auto-derived and manual problems: removing an auto-derived one just
// deselects it (same effect as unticking it in the picker), since `problems`
// IS the selected set either way.
function SelectedProblemCard({ p, categoryLabel, onRemove }) {
  return (
    <div className="tech-card" style={{ borderColor: BRAND.purple }}>
      <div className="tech-card-head">
        <div className="tech-card-title" style={{ fontSize: 13.5 }}>
          {p.name} <span style={chip(BRAND.purpleFaint, BRAND.purpleDark)}>{categoryLabel(p.category)}</span>
          {p.manual && <span style={chip("#f1f5f9", "#64748b")}>Manual</span>}
        </div>
        <div className="tech-card-actions">
          <button type="button" className="tech-card-del" onClick={onRemove} aria-label="Remove">✕</button>
        </div>
      </div>
      {p.findings?.length > 0 && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
          {p.findings.map((f, i) => (
            <div key={i} style={{ fontSize: 11.5, color: BRAND.gray }}>
              <span style={{ fontWeight: 600 }}>{f.label}:</span> {renderVal(f.value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProblemsPhase({ suggested, problems, setProblems, onNext, condition, setting, floatingCTA }) {
  const kb = useKB();
  const { categoryLabel, conditionLabel, settingLabel, PROBLEM_CATEGORIES } = kb;
  // Single always-open view (2026-09-18, Aditi: "in the problem list it
  // should show which problems are there normally... why it is asking me
  // to select one problem at least it is wrong") -- reverts the same-day
  // "compact list, suggestions hidden behind + Add problem" change: the
  // suggested findings should be visible and selectable immediately, and
  // reaching Goals must never require picking a problem first.
  const [manualOpen, setManualOpen] = useState(false);
  const [mCat, setMCat] = useState("");
  const [mName, setMName] = useState("");
  const chosenIds = new Set(problems.map((p) => p.sourceId || p.id));
  const manualProblems = problems.filter((p) => p.manual);

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
      <SectionIntro icon="🧩" title="Problem list" sub="Suggested from the findings you already recorded — select the ones you want to treat, or add your own." />
      <PrecautionsBanner condition={condition} setting={setting} />

      {manualProblems.map((p) => (
        <SelectedProblemCard key={p.id} p={p} categoryLabel={categoryLabel} onRemove={() => setProblems(problems.filter((x) => x.id !== p.id))} />
      ))}

      {suggested.length === 0 && !manualProblems.length && (
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

      {/* Always reachable -- Goals/Treatment/Plan must not be gated behind
          picking at least one problem; a therapist who genuinely has none
          to record here still needs a way forward. */}
      <button type="button" className="primary-btn" style={ctaStyle(floatingCTA, { width: "100%", marginTop: 16 })} onClick={onNext}>
        Continue to Goals{problems.length > 0 ? ` (${problems.length})` : ""} →
      </button>
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

function GoalsPhase({ suggested, problems, setProblems, goals, setGoals, onNext, setting, floatingCTA }) {
  const { buildGoalsForProblem } = useKB();
  // Driven straight from `suggested` now, same as Problem List and
  // Treatment -- a goal must not wait on a separate trip to Problem List
  // to "select" the problem first (2026-09-18, Aditi: "goal should
  // normally present... not depended on problem list selected or not").
  // Picking a goal for a not-yet-selected suggestion silently adds that
  // problem too (ensureProblem below), so Problem List and Goals can never
  // drift out of sync with each other.
  const suggestedIds = new Set(suggested.map((s) => s.id));
  // Anything the `suggested` loop below won't cover: added manually, or a
  // prior selection whose originating finding no longer qualifies (data
  // changed since) -- still shown, using its own last-known baseline for
  // template suggestions.
  const otherProblems = problems.filter((p) => p.manual || !suggestedIds.has(p.sourceId));

  const ensureProblem = (s) => {
    const existing = problems.find((p) => (p.sourceId || p.id) === s.id);
    if (existing) return existing;
    const created = { id: uid(), sourceId: s.id, name: s.name, category: s.category, findings: s.findings, baseline: s.baseline, treatmentCategories: s.treatmentCategories, refs: s.refs, evidence: s.evidence, manual: false };
    setProblems([...problems, created]);
    return created;
  };

  // Plain function, not a nested component -- a `<GoalGroup/>` JSX tag
  // defined inside this render would get a fresh identity every render,
  // remounting GoalEditor underneath (and losing its own open/closed
  // state) on every keystroke elsewhere on the page.
  const renderGoalGroup = (key, title, findings, mine, suggestions, onAdd) => (
    <div key={key} style={{ marginBottom: 18 }}>
      <div className="subheading" style={{ marginTop: 10 }}>{title}</div>
      {findings?.length > 0 && (
        <div style={{ fontSize: 11.5, color: BRAND.gray, marginBottom: 8 }}>
          Current: {findings.map((f) => `${f.label} ${renderVal(f.value)}`).join(" · ")}
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
          onClick={() => onAdd(s)}>
          <div>
            <div className="template-row-label">{s.label}</div>
            <div className="template-row-note">{s.baseline} → {s.target} · {s.weeks} weeks · {s.term === "short" ? "STG" : "LTG"}</div>
          </div>
          <span className="template-row-arrow">+</span>
        </button>
      ))}

      <button type="button" className="ghost-btn" style={{ width: "100%", marginTop: 8 }}
        onClick={() => onAdd({ templateId: null, label: "Custom goal", measure: "Custom goal", unit: "", baseline: "", target: "", term: "short", weeks: 4, baselineValue: null, targetValue: null })}>
        ＋ Add custom goal
      </button>
    </div>
  );

  return (
    <>
      <SectionIntro icon="🎯" title="Goals" sub="Pre-filled from this patient's own recorded values — edit anything, or add your own. A problem can have both a short-term and a long-term goal." />

      {suggested.length === 0 && otherProblems.length === 0 && (
        <div className="summary-empty">No goals could be suggested yet — record findings in the assessment steps and they'll appear here. You can still add a problem manually in Problem List.</div>
      )}

      {suggested.map((s) => {
        const local = problems.find((p) => (p.sourceId || p.id) === s.id);
        const mine = local ? goals.filter((g) => g.problemId === local.id) : [];
        const chosenTemplates = new Set(mine.map((g) => g.templateId).filter(Boolean));
        const suggestions = buildGoalsForProblem(s.id, s.baseline, setting).filter((t) => !chosenTemplates.has(t.templateId));
        const onAdd = (goalObj) => {
          const p = local || ensureProblem(s);
          setGoals([...goals, { id: uid(), ...goalObj, problemId: p.id }]);
        };
        return renderGoalGroup(s.id, s.name, s.findings, mine, suggestions, onAdd);
      })}

      {otherProblems.map((p) => {
        const mine = goals.filter((g) => g.problemId === p.id);
        const chosenTemplates = new Set(mine.map((g) => g.templateId).filter(Boolean));
        const suggestions = p.sourceId ? buildGoalsForProblem(p.sourceId, p.baseline, setting).filter((t) => !chosenTemplates.has(t.templateId)) : [];
        const onAdd = (goalObj) => setGoals([...goals, { id: uid(), ...goalObj, problemId: p.id }]);
        return renderGoalGroup(p.id, p.name, p.findings, mine, suggestions, onAdd);
      })}

      <button type="button" className="primary-btn" style={ctaStyle(floatingCTA, { width: "100%", marginTop: 8 })} onClick={onNext}>
        Continue to Treatment{goals.length > 0 ? ` (${goals.length})` : ""} →
      </button>
    </>
  );
}

/* ─── 3. TREATMENT (goal-wise) ────────────────────────────── */
// Persistent "Select source" tabs (2026-09-11) -- General Library / Evidence-
// Based Protocol / My Clinic Protocol as one always-visible row instead of
// link-style rows the therapist had to tap into and then "← back" out of.
function SourceTab({ icon, label, sub, active, onClick }) {
  return (
    <button type="button" className={"source-tab" + (active ? " active" : "")} onClick={onClick}>
      <span className="source-tab-icon">{icon}</span>
      <span className="source-tab-label">{label}</span>
      {sub && <span className="source-tab-sub">{sub}</span>}
    </button>
  );
}

// Inline treatment picker (2026-09-11, Aditi: "I don't want my treatment
// section to have the add to treatment page... I want this page of general
// library, evidence based protocol, my clinic protocol... presented
// already there") -- this used to be a modal sheet opened by a "+ Add
// treatment" button; it's now rendered directly, permanently, inside the
// Treatment page itself. Not scoped to a single goal any more (there's no
// button-per-goal to open it from) -- goal-linking is just an optional
// checklist on the dose-confirm screen, same as the "general" treatment
// flow already supported.
function AddTreatmentPanel({ allGoals, existing, onAdd, requireAuth, search, setSearch, searchOpen, setSearchOpen, floatingCTA, onDoseEditingChange }) {
  const kb = useKB();
  const { ASSIST_LADDER, exerciseCategories, manualTechniques, evidenceProtocols, clinicProtocols, fullExerciseLibrary, defaultRegionKey } = kb;
  // Full region switcher (2026-09-11, Aditi: "exercise prescription have
  // all data of general library... add whole page to general library") --
  // ortho-only; General Library browses the SAME EXERCISE_DB region picker
  // Exercise Prescription uses, instead of being locked to whichever
  // region(s) were picked during the assessment.
  const regionKeys = useMemo(() => Object.keys(EXERCISE_DB), []);
  const [region, setRegion] = useState(fullExerciseLibrary ? (defaultRegionKey || regionKeys[0]) : null);
  const activeCategories = fullExerciseLibrary ? (EXERCISE_DB[region]?.categories || {}) : exerciseCategories;
  const cats = useMemo(() => Object.keys(activeCategories), [activeCategories]);
  const [cat, setCat] = useState(null);
  // search/searchOpen are lifted up into TreatmentPhase and passed down as
  // props -- see the 2026-09-16 comment there -- so the toggle button can
  // live in the SectionIntro title row (top-right) instead of its own row.
  const [picked, setPicked] = useState(null);
  const [dose, setDose] = useState(null);
  const [linked, setLinked] = useState([]);
  const [techType, setTechType] = useState(null);
  const [techForm, setTechForm] = useState(BLANK_TECHNIQUE);
  const setTechField = (k, v) => setTechForm((f) => ({ ...f, [k]: v }));
  // "Evidence-based protocol" / "My clinic protocols" (2026-09-11) -- two
  // extra browse modes alongside the existing category/search browsing,
  // both ortho-only (gated by kb flags). Either one just hands a raw
  // exercise object to the SAME startDose()/onAdd() pipeline every other
  // source already uses -- no new dose screen, no new onAdd shape.
  const [browseMode, setBrowseMode] = useState(null); // null | "protocol" | "clinic"
  const [kind, setKind] = useState("exercises"); // "exercises" | "manual" -- which library sub-view is shown
  // Tells TreatmentPhase to hide its own floating "Review treatment plan"
  // button while a dose is being edited here, so the two fixed-position
  // bars don't stack on top of each other at the same screen position
  // (2026-09-16, Aditi: "after selecting treatment it['s] button is not
  // constant showing... in manual technique also").
  useEffect(() => { onDoseEditingChange?.(!!(picked || techType)); }, [picked, techType]);
  const [savedProtocols, setSavedProtocols] = useState([]);
  const [savedProtocolsLoading, setSavedProtocolsLoading] = useState(false);
  const openClinicProtocols = () => {
    if (requireAuth && !requireAuth("Clinic Protocols", "Clinic Protocols are saved to your account so you can reuse them across patients and devices — sign in to save and access yours.")) return;
    setBrowseMode("clinic");
    setSavedProtocolsLoading(true);
    listClinicProtocols().then((rows) => { setSavedProtocols(rows); setSavedProtocolsLoading(false); });
  };

  const all = useMemo(() => Object.entries(activeCategories).flatMap(([c, list]) => list.map((e) => ({ ...e, _cat: c }))), [activeCategories]);

  const results = search.trim()
    ? all.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.target.toLowerCase().includes(search.toLowerCase()))
    : cat === ALL_TYPES ? all : cat ? all.filter((e) => e._cat === cat) : [];

  const startDose = (ex) => {
    setPicked(ex);
    setDose({ sets: ex.sets, reps: ex.reps, hold: ex.hold, duration: "", assistance: "", equipment: "", freq: ex.freq });
  };

  return (
    <div style={(picked || techType) ? FLOATING_PAD : undefined}>
      {(picked || techType) && (
        <div style={{ fontWeight: 800, fontSize: 15, margin: "4px 0 10px" }}>
          {picked ? picked.name : TECHNIQUE_TYPES.find((t) => t.key === techType)?.label}
        </div>
      )}

      {!picked && !techType && (
        <>
          {searchOpen && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0 10px" }}>
              <input
                autoFocus
                className="ct-search"
                style={{ flex: 1, width: "auto" }}
                placeholder="🔍 Search treatment or goal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                type="button"
                aria-label="Close search"
                onClick={() => { setSearch(""); setSearchOpen(false); }}
                style={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", border: `1.5px solid ${BRAND.border}`, background: "#fff", color: BRAND.gray, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >✕</button>
            </div>
          )}

          {!search.trim() && (evidenceProtocols || clinicProtocols) && (
            <div style={{ display: "flex", gap: 8, padding: "0 0 12px" }}>
              <SourceTab icon="📚" label="General Library" active={!browseMode} onClick={() => setBrowseMode(null)} />
              {evidenceProtocols && (
                <SourceTab icon="🎯" label="Evidence-Based Protocol" sub="RECOMMENDED" active={browseMode === "protocol"} onClick={() => setBrowseMode("protocol")} />
              )}
              {clinicProtocols && (
                <SourceTab icon="📄" label="My Clinic Protocol" active={browseMode === "clinic"} onClick={openClinicProtocols} />
              )}
            </div>
          )}

          {!browseMode && !search.trim() && manualTechniques && (
            <div style={{ display: "flex", gap: 6, padding: "0 0 10px" }}>
              <button type="button" onClick={() => setKind("exercises")}
                style={{ flex: 1, padding: "7px 8px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 11.5,
                  border: `1.5px solid ${kind === "exercises" ? BRAND.purple : BRAND.border}`,
                  background: kind === "exercises" ? BRAND.purpleFaint : "#fff", color: kind === "exercises" ? BRAND.purpleDark : BRAND.gray }}>
                🏋 Exercises
              </button>
              <button type="button" onClick={() => setKind("manual")}
                style={{ flex: 1, padding: "7px 8px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 11.5,
                  border: `1.5px solid ${kind === "manual" ? BRAND.purple : BRAND.border}`,
                  background: kind === "manual" ? BRAND.purpleFaint : "#fff", color: kind === "manual" ? BRAND.purpleDark : BRAND.gray }}>
                🖐 Manual / Other Treatments
              </button>
            </div>
          )}

          <div style={{ padding: "2px 0 4px" }}>
            {!search.trim() && browseMode === "protocol" && (
              <div className="ct-group">
                <EvidenceProtocolBrowser
                  isAdded={(ex) => existing.has(ex.id)}
                  onAddExercise={(ex) => { setBrowseMode(null); startDose({ ...ex, _cat: "Evidence-Based Protocol" }); }}
                />
              </div>
            )}
            {!search.trim() && browseMode === "clinic" && (
              <div className="ct-group">
                {savedProtocolsLoading && <div className="summary-empty">Loading…</div>}
                {!savedProtocolsLoading && savedProtocols.length === 0 && (
                  <div className="summary-empty">No saved protocols yet — build one from the Treatment list below (or the Exercise Prescription step) and save it there.</div>
                )}
                {savedProtocols.map((p) => (
                  <div key={p.id} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.ink, marginBottom: 6 }}>{p.name}</div>
                    {(p.exercises || []).map((ex) => (
                      <button key={ex.id} type="button" className="ct-item" onClick={() => { setBrowseMode(null); startDose({ ...ex, _cat: "My Clinic Protocol" }); }}>
                        <span style={{ flex: 1, textAlign: "left" }}>
                          <span style={{ fontWeight: 600 }}>{ex.name}</span>
                          <span style={{ display: "block", fontSize: 11, color: BRAND.gray }}>{ex.target}</span>
                        </span>
                        <span style={{ color: BRAND.purple, fontWeight: 700, fontSize: 12 }}>＋ Add</span>
                      </button>
                    ))}
                    {/* Techniques saved onto a protocol (2026-09-19) reopen the
                        SAME techniqueEntryForm screen manual add already uses,
                        pre-filled from the saved record -- so the therapist can
                        still adjust grade/laterality/etc. for this patient
                        before it's actually added, same as exercises going
                        through startDose() first. `name`/`category` are
                        stripped back out since techForm only carries the raw
                        per-type fields; techniqueLabel(techForm) recomputes
                        the display name on Add. */}
                    {(p.techniques || []).map((t, i) => {
                      const { name, category, ...techFields } = t;
                      return (
                        <button key={"tech" + i} type="button" className="ct-item"
                          onClick={() => { setBrowseMode(null); setTechType(t.type); setTechForm({ ...BLANK_TECHNIQUE, ...techFields, response: "" }); }}>
                          <span style={{ flex: 1, textAlign: "left" }}>
                            <span style={{ fontWeight: 600 }}>{name}</span>
                            <span style={{ display: "block", fontSize: 11, color: BRAND.gray }}>{TECHNIQUE_TYPES.find((tt) => tt.key === t.type)?.label}</span>
                          </span>
                          <span style={{ color: BRAND.purple, fontWeight: 700, fontSize: 12 }}>＋ Add</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            {!browseMode && !search.trim() && kind === "exercises" && fullExerciseLibrary && (
              <div style={{ marginBottom: 14 }}>
                <SelectField label="Region" type="single" options={regionKeys.map((k) => EXERCISE_DB[k].label)}
                  value={EXERCISE_DB[region]?.label}
                  onChange={(label) => { setRegion(regionKeys.find((k) => EXERCISE_DB[k].label === label) || region); setCat(null); }} />
              </div>
            )}
            {!browseMode && !search.trim() && !cat && kind === "exercises" && (
              <div className="ct-group">
                <div className="ct-group-title">TREATMENT TYPES</div>
                <div className="tile-grid-2">
                  <button type="button" className="tile-card" onClick={() => setCat(ALL_TYPES)}>
                    <div className="tile-card-icon">🗂️</div>
                    <div className="tile-card-label">All</div>
                    <div className="tile-card-desc">{all.length} exercise{all.length === 1 ? "" : "s"}</div>
                  </button>
                  {cats.map((c) => (
                    <button key={c} type="button" className="tile-card" onClick={() => setCat(c)}>
                      <div className="tile-card-icon">🏋</div>
                      <div className="tile-card-label">{c}</div>
                      <div className="tile-card-desc">{activeCategories[c].length} exercise{activeCategories[c].length === 1 ? "" : "s"}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Manual entry — for modalities/techniques not in the exercise
                library (SWD, ultrasound, dry needling, manual therapy, taping…)
                so the therapist can add anything and still attach it to a goal
                (2026-09-05, Aditi: technique section "should have the freedom
                to put by the therapist"). Opens the SAME type-specific form
                (Maitland grade, DN muscle/needles, taping pattern, US
                frequency, etc.) as the ortho assessment's own "Treatment
                Techniques" step, not a generic dose screen. Ortho-only
                (2026-09-09, Aditi: "remove the technique from neuro tab
                because it is [an] ortho technique") -- these are MSK manual
                therapy modalities, not part of Neuro's own treatment
                vocabulary; Neuro's Add Treatment stays exercise-library-only. */}
            {!browseMode && !search.trim() && !cat && kind === "manual" && manualTechniques && (
              <div className="ct-group">
                <div className="ct-group-title">ADD A TECHNIQUE / MODALITY</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "4px 2px 6px" }}>
                  {TECHNIQUE_TYPES.map((t) => (
                    <button key={t.key} type="button"
                      onClick={() => { setTechType(t.key); setTechForm({ ...BLANK_TECHNIQUE, type: t.key }); }}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12.5,
                        border: `1.5px solid ${BRAND.border}`, background: "#fff", color: BRAND.ink }}>
                      <span>{t.icon}</span>{t.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, color: BRAND.gray, padding: "6px 4px 0" }}>Pick a technique type → fill in its details on the next screen; it attaches to this goal and flows into Sessions &amp; Progress.</div>
              </div>
            )}
            {(search.trim() || (!browseMode && cat)) && (
              <div className="ct-group">
                <div className="ct-group-title">
                  {search.trim() ? `RESULTS (${results.length})` : cat === ALL_TYPES ? "All" : cat}
                  {!search.trim() && <button type="button" onClick={() => setCat(null)} style={{ marginLeft: 8, background: "none", border: "none", color: BRAND.purple, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>← all types</button>}
                </div>
                {results.length === 0 && <div className="summary-empty">No matching treatments.</div>}
                {/* Thumbnail (2026-09-16, Aditi: "the photos... beside the
                    exercise name... when we click on the photo, it should
                    show the info card") -- same imageTrigger pattern ROM/
                    Special Tests already use, same Cloudinary asset the
                    info sheet's own hero photo shows, so thumbnail and
                    sheet can't drift apart. Row itself is a div now (a
                    button can't nest another button), with the
                    thumbnail as its own tap target and the name/target
                    area as a separate button that starts dosing. */}
                {results.map((e) => {
                  const already = existing.has(e.id);
                  return (
                    <div key={e.id} className="ct-item" style={{ paddingLeft: 4 }}>
                      <InfoButton imageTrigger small fallbackIcon="ti-barbell" title={e.name} richItem={exerciseRichItem(e)} />
                      <button type="button" onClick={() => (already ? null : startDose(e))} disabled={already}
                        style={{ flex: 1, display: "flex", alignItems: "center", background: "none", border: "none", padding: 0, cursor: already ? "default" : "pointer", fontFamily: "inherit" }}>
                        <span style={{ flex: 1, textAlign: "left" }}>
                          <span style={{ fontWeight: 600 }}>{e.name}</span>
                          <span style={{ display: "block", fontSize: 11, color: BRAND.gray }}>{e.target}</span>
                        </span>
                        <span style={{ color: already ? BRAND.gray : BRAND.purple, fontWeight: 700, fontSize: 12 }}>{already ? "Added" : "＋ Add"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {picked && dose && (
        <>
          <div className="dose-compact">
            {/* Compact dose form (2026-09-11, Aditi: "each exercise dosage
                set page ... talking so much space ... make it compact") --
                the four fields below used to be full-width FieldShells
                stacked one per row (label row + 44px input + 16px margin
                each, ~320px total just for Duration/Assistance/Equipment/
                Frequency). Same fields, same components, just laid out two
                per row with tighter label/input sizing, scoped to this
                form only via the .dose-compact class so nothing else that
                reuses TextField/SelectField elsewhere is affected. */}
            <style>{`
              .dose-compact .field-block { margin-bottom: 10px; }
              .dose-compact .field-label-row { margin-bottom: 3px; }
              .dose-compact .field-label { font-size: 11.5px; }
              .dose-compact .text-input-wrap, .dose-compact .select-wrap { min-height: 38px; padding: 2px 6px 2px 10px; }
              .dose-compact .text-input, .dose-compact .select-input { font-size: 13px; padding: 6px 2px; }
              .dose-compact .select-btn { padding: 6px 8px; font-size: 10px; min-height: 28px; }
              .dose-compact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
              .dose-compact-grid > .field-block { min-width: 0; }
              .dose-compact-grid .text-input-wrap, .dose-compact-grid .select-wrap { min-width: 0; }
              .dose-compact-grid .select-btn { padding: 6px 6px; }
            `}</style>
            <div style={{ fontSize: 12, color: BRAND.gray, marginBottom: 8 }}>{picked.target}</div>
            <div className="subheading" style={{ marginTop: 0 }}>Dose</div>
            <div className="row-2" style={{ flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
              <div className="vital-field"><div className="vital-label-row"><span className="vital-label">Sets</span></div><Stepper value={String(dose.sets ?? "")} onChange={(v) => setDose({ ...dose, sets: v })} min={0} max={20} square /></div>
              <div className="vital-field"><div className="vital-label-row"><span className="vital-label">Reps</span></div><Stepper value={String(dose.reps ?? "")} onChange={(v) => setDose({ ...dose, reps: v })} min={0} max={60} square /></div>
              <div className="vital-field"><div className="vital-label-row"><span className="vital-label">Hold (s)</span></div><Stepper value={String(dose.hold ?? "")} onChange={(v) => setDose({ ...dose, hold: v })} min={0} max={600} square /></div>
            </div>
            <div className="dose-compact-grid">
              <TextField label="Duration (optional)" value={dose.duration} onChange={(v) => setDose({ ...dose, duration: v })} placeholder="e.g. 10 min" />
              <TextField label="Frequency" value={dose.freq} onChange={(v) => setDose({ ...dose, freq: v })} placeholder="e.g. 3 × / week" />
              <SelectField label="Assistance" type="single" options={ASSIST_LADDER} value={dose.assistance} onChange={(v) => setDose({ ...dose, assistance: v })} />
              <SelectField label="Equipment" type="single" options={EQUIPMENT} value={dose.equipment} onChange={(v) => setDose({ ...dose, equipment: v })} />
            </div>

            {/* One treatment, many goals -- avoids creating a duplicate
                record of the same intervention per goal. Goals are optional
                (2026-09-11, Aditi: "not add to treatment without goal or
                problem list needed") -- a treatment can be added straight
                from the library with no goal picked yet, and linked to one
                later once it exists. */}
            {allGoals.length > 0 ? (
              <>
                <div className="subheading" style={{ marginTop: 14 }}>Add to goal(s) (optional)</div>
                {allGoals.map((g) => {
                  const on = linked.includes(g.id);
                  return (
                    <button key={g.id} type="button" className={"ct-item" + (on ? " ct-item-checked" : "")} onClick={() => setLinked(on ? linked.filter((x) => x !== g.id) : [...linked, g.id])}>
                      <span className="ct-checkbox">{on ? "☑" : "☐"}</span>
                      <span style={{ textAlign: "left" }}>{g.measure} <span style={{ color: BRAND.gray, fontSize: 11 }}>({g.baseline} → {g.target})</span></span>
                    </button>
                  );
                })}
              </>
            ) : (
              <div style={{ fontSize: 10.5, color: BRAND.gray, padding: "6px 4px 0" }}>No goals yet — this will be saved as a general treatment; link it to a goal once you add one.</div>
            )}
          </div>
          <div style={ctaStyle(floatingCTA, { display: "flex", gap: 8, marginTop: 14 })}>
            <button type="button" className="ghost-btn" style={{ flex: 1 }} onClick={() => { setPicked(null); setDose(null); }}>Back</button>
            <button type="button" className="primary-btn" style={{ flex: 2 }}
              onClick={() => { onAdd({ id: uid(), exerciseId: picked.id, name: picked.name, category: picked._cat, ...dose, goalIds: linked }); setPicked(null); setDose(null); setLinked([]); }}>
              Add to plan
            </button>
          </div>
        </>
      )}

      {techType && (
        <>
          <div>
            <div style={{ fontSize: 12, color: BRAND.gray, marginBottom: 10 }}>
              Not linked to a goal yet — you can link it below once you add one.
            </div>
            {techniqueEntryForm(techType, techForm, setTechField)}
            <TextArea label="Patient response during technique" value={techForm.response} onChange={(v) => setTechField("response", v)} placeholder="e.g. pain reproduction +, ROM improved, comfortable" />
            {techType !== "dn" && techType !== "taping" && <TextArea label="Additional notes" value={techForm.notes} onChange={(v) => setTechField("notes", v)} />}

            {allGoals.length > 0 ? (
              <>
                <div className="subheading" style={{ marginTop: 14 }}>Add to goal(s) (optional)</div>
                {allGoals.map((g) => {
                  const on = linked.includes(g.id);
                  return (
                    <button key={g.id} type="button" className={"ct-item" + (on ? " ct-item-checked" : "")} onClick={() => setLinked(on ? linked.filter((x) => x !== g.id) : [...linked, g.id])}>
                      <span className="ct-checkbox">{on ? "☑" : "☐"}</span>
                      <span style={{ textAlign: "left" }}>{g.measure} <span style={{ color: BRAND.gray, fontSize: 11 }}>({g.baseline} → {g.target})</span></span>
                    </button>
                  );
                })}
              </>
            ) : (
              <div style={{ fontSize: 10.5, color: BRAND.gray, padding: "6px 4px 0" }}>No goals yet — this will be saved as a general treatment; link it to a goal once you add one.</div>
            )}
          </div>
          <div style={ctaStyle(floatingCTA, { display: "flex", gap: 8, marginTop: 14 })}>
            <button type="button" className="ghost-btn" style={{ flex: 1 }} onClick={() => { setTechType(null); setTechForm(BLANK_TECHNIQUE); }}>Back</button>
            <button type="button" className="primary-btn" style={{ flex: 2 }}
              onClick={() => { onAdd({ id: uid(), name: techniqueLabel(techForm), category: "Technique", ...techForm, goalIds: linked }); setTechType(null); setTechForm(BLANK_TECHNIQUE); setLinked([]); }}>
              Add to plan
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function doseLine(t) {
  // Techniques (added via TECHNIQUE_TYPES) use durationMin/frequency, not
  // the exercise library's reps/hold/equipment/assistance/freq shape.
  if (t.type) {
    const parts = [];
    if (t.sets) parts.push(`${t.sets} sets`);
    if (t.durationMin) parts.push(`${t.durationMin} min`);
    if (t.frequency) parts.push(`${t.frequency}x/wk`);
    if (t.dosage) parts.push(t.dosage);
    return parts.join(" • ");
  }
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

function TreatmentPhase({ problems, goals, treatments, setTreatments, onNext, floatingCTA, requireAuth }) {
  const general = treatments.filter((t) => !t.goalIds || t.goalIds.length === 0);
  // Lifted out of AddTreatmentPanel (2026-09-16, Aditi: "the magnifying
  // glass should be in the top right") so the search toggle can sit in the
  // SectionIntro title row instead of on its own row below, with a gap of
  // dead space before the treatment-type tiles.
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  // Hides this component's own floating "Review treatment plan" bar while
  // AddTreatmentPanel's floating "Add to plan" bar is showing -- both are
  // position:fixed at the same spot, so only one can be on screen at once.
  const [doseEditing, setDoseEditing] = useState(false);
  // The picker sits permanently on the page again (2026-09-18, Aditi:
  // "care plan treatment should open normally it should not say add to
  // treatment") -- reverts the same-day "+ Add treatment" gate back to
  // the 2026-09-11 design (general library / evidence protocol / clinic
  // protocol presented directly, no button-press to reveal it).

  // Save as Clinic Protocol, straight from this list (2026-09-19) -- until
  // now the only save path was the separate Exercise Prescription step,
  // and it only captured exercises. This list already has the full,
  // already-built plan (exercises AND manual techniques together), so
  // saving from here bundles both into one reusable protocol instead of
  // needing two different screens to build one template.
  const techniqueCount = treatments.filter((t) => t.category === "Technique").length;
  const exerciseCount = treatments.length - techniqueCount;
  const [saveProtocolOpen, setSaveProtocolOpen] = useState(false);
  const [saveProtocolName, setSaveProtocolName] = useState("");
  const [saveProtocolMsg, setSaveProtocolMsg] = useState("");
  const saveProtocol = () => {
    if (requireAuth && !requireAuth("Clinic Protocols", "Clinic Protocols are saved to your account so you can reuse them across patients and devices — sign in to save and access yours.")) return;
    if (!treatments.length) return;
    setSaveProtocolOpen(true);
  };
  const confirmSaveProtocol = async () => {
    try {
      // Strip patient-specific bits before saving as a reusable template:
      // `id` is a per-add uid, `goalIds` links to THIS patient's goals, and
      // a technique's `response` ("Patient response during technique") is
      // clinical documentation for this visit, not a sane default for the
      // next patient.
      const exercises = treatments.filter((t) => t.category !== "Technique").map(({ id, goalIds, ...rest }) => rest);
      const techniques = treatments.filter((t) => t.category === "Technique").map(({ id, goalIds, response, ...rest }) => rest);
      await saveClinicProtocol({ name: saveProtocolName, exercises, techniques });
      setSaveProtocolOpen(false);
      setSaveProtocolName("");
      setSaveProtocolMsg("Saved to My Clinic Protocols.");
      setTimeout(() => setSaveProtocolMsg(""), 3000);
    } catch (e) {
      setSaveProtocolMsg("Couldn't save -- " + (e.message || "try again."));
      setTimeout(() => setSaveProtocolMsg(""), 4000);
    }
  };

  return (
    <>
      <SectionIntro icon="🏋" title="Treatment" action={!searchOpen && (
        <button type="button" aria-label="Search treatments" onClick={() => setSearchOpen(true)}
          style={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", border: `1.5px solid ${BRAND.border}`, background: "#fff", color: BRAND.purpleDark, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >🔍</button>
      )} />
      {goals.map((g) => {
        const mine = treatments.filter((t) => t.goalIds.includes(g.id));
        if (!mine.length) return null;
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
          </div>
        );
      })}

      {general.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          {goals.length > 0 && <div className="subheading" style={{ marginTop: 10 }}>General</div>}
          {general.map((t) => (
            <div key={t.id} className="tech-card">
              <div className="tech-card-head">
                <div className="tech-card-title" style={{ fontSize: 13 }}>{t.name}</div>
                <div className="tech-card-actions">
                  <button type="button" className="tech-card-del" onClick={() => setTreatments(treatments.filter((x) => x.id !== t.id))} aria-label="Remove treatment">✕</button>
                </div>
              </div>
              <div className="tech-card-meta">{doseLine(t)}</div>
            </div>
          ))}
        </div>
      )}

      {!treatments.length && <div className="summary-empty">No treatments added yet -- browse and add from the library below, or continue on without any.</div>}

      {treatments.length > 0 && !doseEditing && (
        <button type="button" className="ghost-btn" style={{ width: "100%", marginTop: 4, marginBottom: 10 }} onClick={saveProtocol}>
          💾 Save as Clinic Protocol
        </button>
      )}
      {saveProtocolMsg && <div className="hint" style={{ color: saveProtocolMsg.startsWith("Couldn't") ? "#dc2626" : "#059669", fontWeight: 600, marginBottom: 8 }}>{saveProtocolMsg}</div>}

      {/* Always reachable, same reasoning as Problems/Goals -- an empty
          treatment list must not block moving on. Hidden only while a dose
          is actively being edited below, so the two fixed-position bars
          don't stack on top of each other. */}
      {!doseEditing && (
        <button type="button" className="primary-btn" style={ctaStyle(floatingCTA, { width: "100%", marginTop: 10, marginBottom: 14 })} onClick={onNext}>Review treatment plan →</button>
      )}

      {saveProtocolOpen && (
        <div className="ct-modal" style={{ position: "fixed", inset: 0, zIndex: 3100 }}>
          <div className="ct-modal-header">
            <div className="ct-modal-title">Save as Clinic Protocol</div>
            <button type="button" className="ct-modal-close" onClick={() => setSaveProtocolOpen(false)} aria-label="Close">✕</button>
          </div>
          <div className="ct-modal-body">
            <TextField label="Protocol name" value={saveProtocolName} onChange={setSaveProtocolName} placeholder="e.g. Frozen shoulder — mob + exercise" />
            <div className="hint">
              Saves {exerciseCount > 0 ? `${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}` : ""}
              {exerciseCount > 0 && techniqueCount > 0 ? " and " : ""}
              {techniqueCount > 0 ? `${techniqueCount} technique${techniqueCount === 1 ? "" : "s"}` : ""}
              {" "}from this plan for reuse on future patients.
            </div>
          </div>
          <div className="ct-modal-footer">
            <button type="button" className="primary-btn" style={{ width: "100%" }} disabled={!saveProtocolName.trim()} onClick={confirmSaveProtocol}>
              Save
            </button>
          </div>
        </div>
      )}

      <AddTreatmentPanel
        allGoals={goals}
        existing={new Set(treatments.map((t) => t.exerciseId))}
        requireAuth={requireAuth}
        floatingCTA={floatingCTA}
        onDoseEditingChange={setDoseEditing}
        search={search} setSearch={setSearch} searchOpen={searchOpen} setSearchOpen={setSearchOpen}
        onAdd={(t) => {
          // If this exercise is already in the plan (added under another
          // goal), just link the existing record to the newly picked goals too.
          const dup = treatments.find((x) => x.exerciseId && x.exerciseId === t.exerciseId);
          if (dup) setTreatments(treatments.map((x) => (x.id === dup.id ? { ...x, goalIds: [...new Set([...x.goalIds, ...t.goalIds])] } : x)));
          else setTreatments([...treatments, t]);
        }}
      />
    </>
  );
}

/* ─── 4. PLAN OVERVIEW ────────────────────────────────────── */
// Also the Care Plan's landing page (2026-09-18, Aditi: "the care plan
// should open like this page ... when we click on goal it should [show]
// what goals we have put ... edit button we can add more or remove ... same
// if click on problem list"). Each stat tile is a doorway into that phase's
// OWN existing UI -- Problems already lets you toggle suggestions and
// remove manual entries, Goals already has Edit/✕ per goal, Treatment
// already lists everything added with ✕ and the always-on picker below it
// -- so no new edit surface was needed, just a way in from here.
function PlanPhase({ problems, goals, treatments, onGoToPhase }) {
  const general = treatments.filter((t) => !t.goalIds || t.goalIds.length === 0);
  // The count tiles used to either jump to a whole other editor screen (too
  // far) or do nothing at all (too far the other way -- 2026-09-18, Aditi:
  // "if I click on two goals I don't have to scroll down" -- she still
  // wants tapping "2 Goals" to land her on the goals right away, just
  // without leaving this page). scrollIntoView jumps straight to that
  // section further down THIS SAME page instead of switching views.
  const problemsRef = useRef(null);
  const goalsRef = useRef(null);
  const treatmentRef = useRef(null);
  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <>
      <SectionIntro icon="📋" title="Care plan" sub="What you intend to do. Tap a number to jump straight to that list." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(70px,1fr))", gap: 8, marginBottom: 16 }}>
        {[["Problems", problems.length, problemsRef], ["Goals", goals.length, goalsRef], ["Treatments", treatments.length, treatmentRef]].map(([l, v, ref]) => (
          <button key={l} type="button" onClick={() => scrollTo(ref)}
            style={{ background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 12, padding: "10px 6px", textAlign: "center", cursor: "pointer", fontFamily: "inherit" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: BRAND.purpleDark }}>{v}</div>
            <div style={{ fontSize: 10.5, color: BRAND.gray, fontWeight: 600 }}>{l}</div>
          </button>
        ))}
      </div>

      {problems.length === 0 && goals.length === 0 && general.length === 0 && <div className="summary-empty">Nothing planned yet. Tap "+ Add problem" below to get started.</div>}

      {/* The written-out problem list itself -- previously a problem with no
          goal yet was invisible here (only its count showed, e.g. "1 problem
          selected"), which read as "it doesn't show what I picked" even
          though the selection had saved fine (2026-09-18, Aditi: "when I
          pick problem ... it doesn't show what problem I have selected").
          Every selected problem now prints by name, with a nudge for the
          ones that don't have a goal attached yet. */}
      <div ref={problemsRef} style={{ scrollMarginTop: 12 }}>
        {problems.length > 0 && (
          <div className="summary-card" style={{ cursor: "default" }}>
            <div className="summary-title">🧩 Problem list</div>
            {problems.map((p) => {
              const hasGoal = goals.some((g) => g.problemId === p.id);
              return (
                <div key={p.id} className="summary-row">
                  <span className="summary-key">{p.name}</span>
                  {!hasGoal && <span className="summary-val" style={{ color: BRAND.grayLight, fontStyle: "italic" }}>No goal yet</span>}
                </div>
              );
            })}
          </div>
        )}
        <button type="button" className="ghost-btn" style={{ width: "100%", marginBottom: 16 }} onClick={() => onGoToPhase?.("problems")}>＋ Add problem</button>
      </div>

      <div ref={goalsRef} style={{ scrollMarginTop: 12 }}>
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
        {general.length > 0 && (
          <div className="summary-card" style={{ cursor: "default" }}>
            <div className="summary-title">General (not linked to a goal)</div>
            {general.map((t) => (
              <div key={t.id} className="summary-row">
                <span className="summary-key">{t.name}</span>
                <span className="summary-val">{doseLine(t)}</span>
              </div>
            ))}
          </div>
        )}
        {problems.length > 0 && (
          <button type="button" className="ghost-btn" style={{ width: "100%", marginBottom: 16 }} onClick={() => onGoToPhase?.("goals")}>＋ Add goal</button>
        )}
      </div>

      {/* A flat, always-visible Treatment list -- before this, a treatment
          only showed up nested inside whichever goal card it was linked to,
          so it read as "missing" from the hub at a glance (2026-09-18,
          Aditi: "isme treatment kyu nahi dikh raha hai" -- why isn't
          treatment showing on this page). Same Problem List / Goals /
          Treatment as their own written-out subtopics the assessment's own
          read-only Care Plan page already uses, just editable here. */}
      <div ref={treatmentRef} style={{ scrollMarginTop: 12 }}>
        {treatments.length > 0 && (
          <div className="summary-card" style={{ cursor: "default" }}>
            <div className="summary-title">🏋 Treatment list</div>
            {treatments.map((t) => {
              const myGoals = goals.filter((g) => (t.goalIds || []).includes(g.id));
              return (
                <div key={t.id} style={{ padding: "8px 0", borderTop: `1px solid ${BRAND.border}` }}>
                  <div className="summary-row" style={{ padding: 0 }}>
                    <span className="summary-key">{t.name}</span>
                    <span className="summary-val">{doseLine(t)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: BRAND.gray, marginTop: 2 }}>
                    {myGoals.length ? `For: ${myGoals.map((g) => g.measure).join(", ")}` : "General (not linked to a goal)"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {problems.length > 0 && (
          <button type="button" className="ghost-btn" style={{ width: "100%" }} onClick={() => onGoToPhase?.("treatment")}>＋ Add treatment</button>
        )}
      </div>
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

function SessionEditor({ draft, setDraft, treatments, goals, sessions, onSave, onCancel }) {
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
          {goals.map((g) => {
            const prev = previousMeasureForGoal(sessions, g.id, draft.id, g.baseline);
            return (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <span style={{ flex: 1, fontSize: 12.5 }}>
                  {g.measure} <span style={{ color: BRAND.gray, fontSize: 11 }}>({g.baseline} → {g.target})</span>
                  {prev && <span style={{ display: "block", fontSize: 10.5, color: BRAND.purpleDark }}>Previous: {prev.value} <span style={{ color: BRAND.gray }}>({prev.source})</span></span>}
                </span>
                <div style={{ width: 90 }}>
                  <TextField label="" value={draft.measures[g.id] ?? ""} onChange={(v) => setDraft({ ...draft, measures: { ...draft.measures, [g.id]: v } })} placeholder={g.unit || "value"} />
                </div>
              </div>
            );
          })}
        </>
      )}

      <div style={{ marginTop: 12 }}>
        <TextArea label="Session note" value={draft.note} onChange={(v) => setDraft({ ...draft, note: v })} placeholder="Overall note for this session" />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" className="ghost-btn" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
        <button type="button" className="primary-btn" style={{ flex: 2 }} onClick={onSave}>Review session →</button>
      </div>
    </div>
  );
}

// Most recent prior session's recorded measure for a goal (chronological,
// excluding the session being edited) -- feeds the "Previous" hint next to
// each measure field, and falls back to the goal's own baseline when no
// session has recorded it yet.
function previousMeasureForGoal(sessions, goalId, excludeId, baseline) {
  const prior = sessions
    .filter((s) => s.id !== excludeId && s.measures?.[goalId] != null && s.measures[goalId] !== "")
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.no || 0) - (b.no || 0));
  const last = prior[prior.length - 1];
  return last ? { value: last.measures[goalId], source: `Session ${last.no}` } : (baseline != null && baseline !== "" ? { value: baseline, source: "Baseline" } : null);
}

// Phase 3 (2026-09-09, Aditi's spec): a Review screen before the session
// actually saves -- "the therapist can look at the whole clinical
// reasoning chain before saving." Problems -> Goals (previous -> today,
// achieved state) -> Treatment performed today -> note. Nothing here is
// editable; "Edit" goes back to the SessionEditor, "Save Session" commits.
function SessionReviewCard({ draft, problems, goals, treatments, sessions, onBack, onConfirm }) {
  const { goalProgress } = useKB();
  const doneItems = draft.items.filter((it) => it.done);
  return (
    <>
      <SectionIntro icon="✅" title="Session Review" sub={`Session ${draft.no} · ${draft.date} — check it over before saving.`} />

      {problems.length > 0 && (
        <div className="tech-card">
          <div className="subheading" style={{ marginTop: 0 }}>Problems</div>
          {problems.map((p) => <div key={p.id} style={{ fontSize: 12.5, padding: "3px 0" }}>• {p.name}</div>)}
        </div>
      )}

      {goals.length > 0 && (
        <div className="tech-card" style={{ marginTop: 10 }}>
          <div className="subheading" style={{ marginTop: 0 }}>Goals</div>
          {goals.map((g) => {
            const prev = previousMeasureForGoal(sessions, g.id, draft.id, g.baseline);
            const today = draft.measures[g.id];
            const entries = [...sessions.filter((s) => s.id !== draft.id), draft]
              .map((s) => ({ value: parseFloat(s.measures?.[g.id]) })).filter((e) => Number.isFinite(e.value));
            const prog = goalProgress(g, entries);
            return (
              <div key={g.id} style={{ padding: "6px 0", borderTop: `1px solid ${BRAND.border}` }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{g.measure} {prog.achieved && <span style={chip("#ecfdf5", "#047857")}>Achieved</span>}</div>
                <div style={{ fontSize: 11.5, color: BRAND.gray, marginTop: 2 }}>
                  {prev ? `${prev.value} (${prev.source})` : "—"} → <b style={{ color: BRAND.ink }}>{today || "not recorded today"}</b>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="tech-card" style={{ marginTop: 10 }}>
        <div className="subheading" style={{ marginTop: 0 }}>Treatment performed today ({doneItems.length}/{draft.items.length})</div>
        {doneItems.length === 0 && <div className="summary-empty">Nothing marked done.</div>}
        {doneItems.map((it) => {
          const t = treatments.find((x) => x.id === it.treatmentId);
          if (!t) return null;
          return <div key={it.treatmentId} style={{ fontSize: 12.5, padding: "3px 0" }}>✓ {t.name} {it.actual && <span style={{ color: BRAND.gray }}>— {it.actual}</span>}</div>;
        })}
      </div>

      {draft.note && (
        <div className="tech-card" style={{ marginTop: 10 }}>
          <div className="subheading" style={{ marginTop: 0 }}>Session note</div>
          <div style={{ fontSize: 12.5 }}>{draft.note}</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button type="button" className="ghost-btn" style={{ flex: 1 }} onClick={onBack}>← Edit</button>
        <button type="button" className="primary-btn" style={{ flex: 2 }} onClick={onConfirm}>💾 Save Session</button>
      </div>
    </>
  );
}

function SessionsPhase({ problems, treatments, goals, sessions, setSessions }) {
  const [draft, setDraft] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const ordered = [...sessions].sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.no - a.no);

  const startNew = () => setDraft(newSessionDraft(treatments, sessions.length + 1));
  const commit = () => {
    const exists = sessions.some((s) => s.id === draft.id);
    setSessions(exists ? sessions.map((s) => (s.id === draft.id ? draft : s)) : [...sessions, draft]);
    setDraft(null);
    setReviewing(false);
  };

  if (draft && reviewing) {
    return (
      <SessionReviewCard
        draft={draft} problems={problems} goals={goals} treatments={treatments} sessions={sessions}
        onBack={() => setReviewing(false)} onConfirm={commit}
      />
    );
  }

  return (
    <>
      <SectionIntro icon="🗓" title="Sessions" sub="Record what actually happened. Each session is seeded from the treatment plan — just adjust Planned vs Actual." />

      {draft ? (
        <SessionEditor draft={draft} setDraft={setDraft} treatments={treatments} goals={goals} sessions={sessions} onSave={() => setReviewing(true)} onCancel={() => setDraft(null)} />
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
  const { goalProgress } = useKB();
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

/* ─── ROOT (generic, knowledge-injected) ──────────────────── */
// `knowledge` is the specialty's rules engine (NEURO_KNOWLEDGE or ortho's);
// `sectionKey` is where the care plan lives on the data object
// ("neuroCarePlan" / "orthoCarePlan"). Everything else is identical UX.
// `phase` (controlled) + `onAdvance`: when the host wants each phase on
// its own page (2026-09-11, Aditi: "problem, goals, treatment... it's so
// much congested... I want in a different section, each of them blends" --
// the Ortho/Neuro wizards mount one carePlan* step per phase and drive
// `phase` off their own step id), the in-page tab bar (PhaseNav) is hidden
// -- the wizard's own StepNav is the only phase switcher -- and each
// phase's own "Next" button advances the wizard instead of an internal tab.
// Omitting `phase` keeps the original single-page, tabbed behaviour
// (SpecialtyPatientProfile.jsx's live profile view, where a wizard-style
// step sequence doesn't apply).
export function CarePlanSection({ data, setData, knowledge, sectionKey, initialPhase, floatingCTA, requireAuth, phase: controlledPhase, onAdvance, restrictPhases }) {
  const [d, set] = useSectionData(data, setData, sectionKey);
  const problems = Array.isArray(d.problems) ? d.problems : [];
  const goals = Array.isArray(d.goals) ? d.goals : [];
  const treatments = Array.isArray(d.treatments) ? d.treatments : [];
  const sessions = Array.isArray(d.sessions) ? d.sessions : [];
  const controlled = controlledPhase != null;
  // Opens on the Plan overview instead of Problem List (2026-09-18, Aditi:
  // "the care plan should open like this page ... when we click on goal it
  // should [show] what goals we have put ... same if click on problem list").
  const [internalPhase, setInternalPhase] = useState(initialPhase || "plan");
  // In the wizard (controlled), each phase is its own step -- tapping a Plan
  // tile used to move the wizard's real step counter to reach it, which read
  // as leaving the Care Plan for "a different tab" of the assessment
  // (2026-09-18, Aditi: "why are you taking me to the problem list of the
  // different tab"). `viewOverride` shows that phase IN PLACE instead,
  // without moving the host wizard's step at all -- the header/step-count
  // stays on "Care Plan" the whole time. Cleared whenever the host wizard's
  // own step actually changes (real Back/Next/step-nav navigation), so a
  // stale override can never survive a real step change.
  const [viewOverride, setViewOverride] = useState(null);
  useEffect(() => { setViewOverride(null); }, [controlledPhase]);
  const phase = controlled ? (viewOverride || controlledPhase) : internalPhase;
  // "Continue"/"Done" inside a phase: normal sequential build (no override)
  // still advances the host wizard to its next real step (`next` unused
  // there -- the wizard's own step order decides what's next); opened via a
  // Plan tile (override active) just closes the override and returns to the
  // hub, since jumping in from the hub shouldn't also silently walk the
  // wizard forward through steps the therapist never asked to visit.
  // Uncontrolled (patient profile) keeps switching straight to `next`, same
  // as always.
  const goNextPhase = (next) => (controlled ? (viewOverride ? setViewOverride(null) : onAdvance?.()) : setInternalPhase(next));
  // The Plan overview's Problems/Goals/Treatment tiles use this to open that
  // phase directly, in place.
  const goToPhase = (id) => (controlled ? setViewOverride(id) : setInternalPhase(id));

  // Recomputed from the live assessment data every render, so editing an
  // assessment value immediately changes what's suggested here.
  const suggested = useMemo(() => knowledge.deriveProblems(data), [data, knowledge]);
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
    <KBContext.Provider value={knowledge}>
      {/* Hide the horizontal scrollbar on scrollable rows — cleaner look
          (2026-09-03, Aditi: "this grey sliding thing i dont like"). */}
      <style>{`.cp-scroll-x::-webkit-scrollbar{display:none}`}</style>
      {/* Hidden on the Plan hub itself -- its own tiles already do the
          navigating (2026-09-18, Aditi: "noo" -- the old pill strip and the
          new tile cards were showing the same Problems/Goals/Treatment
          counts on top of each other). Reappears once you're inside a
          phase, "Plan" included, so there's still a way back to the hub. */}
      {!controlled && phase !== "plan" && <PhaseNav phase={phase} setPhase={setInternalPhase} counts={{ problems: problems.length, goals: goals.length, treatment: treatments.length, plan: 0, sessions: sessions.length, progress: 0 }} phases={restrictPhases} />}
      {/* Only shown when a Plan tile opened this phase in place (viewOverride)
          -- the wizard's own step never moved, so this is the only way back
          to the hub (2026-09-18, Aditi: "click on the problem in that page
          only it should show the problem list" -- no real step change). */}
      {controlled && viewOverride && (
        <button type="button" className="ghost-btn" style={{ marginBottom: 14 }} onClick={() => setViewOverride(null)}>← Back to Care Plan</button>
      )}
      {phase === "problems" && <ProblemsPhase suggested={suggested} problems={problems} setProblems={(v) => set("problems", v)} onNext={() => goNextPhase("goals")} condition={condition} setting={setting} floatingCTA={floatingCTA} />}
      {phase === "goals" && <GoalsPhase suggested={suggested} problems={problems} setProblems={(v) => set("problems", v)} goals={goals} setGoals={(v) => set("goals", v)} onNext={() => goNextPhase("treatment")} setting={setting} floatingCTA={floatingCTA} />}
      {phase === "treatment" && <TreatmentPhase problems={problems} goals={goals} treatments={treatments} setTreatments={(v) => set("treatments", v)} onNext={() => goNextPhase("plan")} floatingCTA={floatingCTA} requireAuth={requireAuth} />}
      {phase === "plan" && <PlanPhase problems={problems} goals={goals} treatments={treatments} onGoToPhase={goToPhase} />}
      {phase === "sessions" && <SessionsPhase problems={problems} treatments={treatments} goals={goals} sessions={sessions} setSessions={(v) => set("sessions", v)} />}
      {phase === "progress" && <ProgressPhase goals={goals} sessions={sessions} />}
    </KBContext.Provider>
  );
}

// Thin wrapper: the Neuro Care Plan is CarePlanSection + neuro knowledge.
export function NeuroCarePlanSection({ data, setData, initialPhase, floatingCTA, phase, onAdvance, restrictPhases }) {
  return <CarePlanSection data={data} setData={setData} knowledge={NEURO_KNOWLEDGE} sectionKey="neuroCarePlan" initialPhase={initialPhase} floatingCTA={floatingCTA} phase={phase} onAdvance={onAdvance} restrictPhases={restrictPhases} />;
}

/* formatters[stepId] contract for a specialty's SummarySection. Shape is
   identical for every specialty (CarePlanSection is shared, see above), so
   this one function serves Neuro's, Ortho's, etc. formatters map; kept
   under both names since existing call sites import it as
   formatNeuroCarePlanSection.

   Returns { groups: [{heading, rows}] } instead of a flat rows[] -- Problem
   List / Goals / Treatment as their own labeled groups (2026-09-09, Aditi:
   "care plan should have problem list, goals, treatment in different
   subtopic, not in whole in one" -- the old version crammed a problem's
   goal and treatment into one combined cell per row, e.g. "Lumbar range of
   motion: ... (4w, LTG) — Tx: Prone Lying"). AssessmentSummary
   (orthoSummary.jsx) renders each group as its own labeled block within
   the step's card. */
export function formatCarePlanSection(section) {
  const problems = Array.isArray(section.problems) ? section.problems : [];
  const goals = Array.isArray(section.goals) ? section.goals : [];
  const treatments = Array.isArray(section.treatments) ? section.treatments : [];
  if (!problems.length) return { groups: [] };

  const problemName = (id) => problems.find((p) => p.id === id)?.name || "—";

  const groups = [
    {
      heading: "Problem List",
      rows: problems.map((p, i) => ({ label: `${i + 1}. ${p.name}`, value: Array.isArray(p.findings) && p.findings.length ? p.findings.map((f) => `${f.label}: ${f.value}`).join(" · ") : "—" })),
    },
    {
      heading: "Goals",
      rows: goals.length
        ? goals.map((g) => ({ label: `${g.measure} (${g.term === "short" ? "STG" : "LTG"}, ${g.weeks}w)`, value: `${g.baseline} → ${g.target} — ${problemName(g.problemId)}` }))
        : [{ label: "No goals set yet", value: "" }],
    },
    {
      heading: "Treatment",
      rows: treatments.length
        ? treatments.map((t) => {
            const myGoals = goals.filter((g) => (t.goalIds || []).includes(g.id));
            return { label: t.name, value: myGoals.length ? myGoals.map((g) => g.measure).join(", ") : "—" };
          })
        : [{ label: "No treatments set yet", value: "" }],
    },
  ];
  return { groups };
}
export const formatNeuroCarePlanSection = formatCarePlanSection;

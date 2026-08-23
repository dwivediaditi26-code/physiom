import React, { useMemo, useState } from "react";
import { SectionIntro, Hint, TextField } from "./orthoFieldKit.jsx";
import { MEASURES, suggestMeasures, REGION_GROUP_LABELS } from "./orthoOutcomeMeasureData.js";
import { contentKeyForRegion } from "./orthoSubjectiveRegionData.js";

/* ============================================================
   OrthoOutcomeMeasureFlow — Outcome Measure step for the
   Outpatient pathway. Replaces the plain free-text score list
   (orthoCommonSections.jsx's OutcomeMeasureSection, still used
   by IPD/Post-op) with: suggest -> select -> fill (one question
   per screen) -> score -> save -> reassess, per the user's
   mockup. Data shape: data.outcomeMeasure.instances[measureId] =
   { answers, history: [{score, domainless, date}] }.
   ============================================================ */

function useOutcomeData(data, setData) {
  const om = data.outcomeMeasure || {};
  const instances = om.instances || {};
  function saveEntry(measureId, answers, score, region) {
    setData((prev) => {
      const prevOm = prev.outcomeMeasure || {};
      const prevInstances = prevOm.instances || {};
      const prevInst = prevInstances[measureId] || { history: [] };
      const history = [...prevInst.history, { score, date: new Date().toISOString(), answers, region }].slice(-10);
      return { ...prev, outcomeMeasure: { ...prevOm, instances: { ...prevInstances, [measureId]: { history } } } };
    });
  }
  return { instances, saveEntry };
}

/* Compact, physiom-style card: small icon + title, thin meta line,
   score/trend on the right, thin divider, two small action buttons.
   Grouped by region (see ListView) instead of a separate region-filter
   control — matches the reference app's always-visible category list. */
function MeasureCard({ measure, suggested, instance, onStart }) {
  const history = instance?.history || [];
  const latest = history[history.length - 1];
  const initial = history[0];
  const hasHistory = history.length > 0;
  const interp = hasHistory ? measure.interpret(latest.score) : null;
  const delta = hasHistory && history.length > 1 ? Math.round((latest.score - initial.score) * 10) / 10 : null;

  return (
    <div className="om-card">
      <div className="om-card-head">
        <span className="om-card-icon">{measure.icon}</span>
        <div className="om-card-title-wrap">
          <div className="om-card-title">
            {measure.label}
            {suggested && <span className="om-suggested-badge">⭐ Suggested</span>}
          </div>
          <div className="om-card-meta">
            {measure.full}
            {hasHistory && (
              <span className="om-card-latest" style={{ color: interp?.color }}>
                {" "}· Last: {latest.score}{measure.unit} — {interp?.label}
              </span>
            )}
          </div>
        </div>
        {hasHistory && (
          <div className="om-card-score" style={{ color: interp?.color }}>
            <div className="om-card-score-num">{latest.score}</div>
            <div className="om-card-score-unit">{measure.unit}</div>
          </div>
        )}
      </div>
      {delta !== null && (
        <div className="om-card-trend">
          Initial {initial.score} → Latest {latest.score} · {delta >= 0 ? "+" : ""}{delta} {delta > 0 ? "↑" : delta < 0 ? "↓" : "–"}
        </div>
      )}
      <div className="om-card-actions">
        <button type="button" className="om-card-action" onClick={() => onStart(measure.id)}>
          {hasHistory ? "👁 Reassess" : "▶ Start Assessment"}
        </button>
      </div>
    </div>
  );
}

function ListView({ selectedRegions, instances, onStart }) {
  const { recommended } = useMemo(() => suggestMeasures({ selectedRegions, contentKeyForRegion }), [selectedRegions]);
  const suggestedIds = new Set(recommended.map((r) => r.id));
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const filtered = Object.values(MEASURES).filter((m) => !query || m.label.toLowerCase().includes(query) || m.full.toLowerCase().includes(query) || (REGION_GROUP_LABELS[m.region] || "").toLowerCase().includes(query));
  const groups = {};
  const order = [];
  filtered.forEach((m) => {
    const cat = REGION_GROUP_LABELS[m.region] || m.region;
    if (!groups[cat]) {
      groups[cat] = [];
      order.push(cat);
    }
    groups[cat].push(m);
  });
  // Suggested regions' groups float to the top, same relative order otherwise.
  order.sort((a, b) => {
    const aSug = groups[a].some((m) => suggestedIds.has(m.id));
    const bSug = groups[b].some((m) => suggestedIds.has(m.id));
    return aSug === bSug ? 0 : aSug ? -1 : 1;
  });

  return (
    <>
      <SectionIntro icon="📊" title="Outcome Measures" info="⭐ Suggested groups match the region(s) picked at Setup — every measure is still one tap away." />
      <div className="text-input-wrap" style={{ marginBottom: 10 }}>
        <input className="text-input" placeholder="🔍 Search scales..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {order.map((cat) => (
        <div key={cat} className="om-group">
          <div className="om-group-head">
            <span className="om-group-title">{cat}</span>
            <span className="om-group-line" />
            <span className="om-group-count">{groups[cat].length}</span>
          </div>
          {groups[cat].map((m) => (
            <MeasureCard key={m.id} measure={m} suggested={suggestedIds.has(m.id)} instance={instances[m.id]} onStart={onStart} />
          ))}
        </div>
      ))}
      {!order.length && <Hint>No scales match.</Hint>}
    </>
  );
}

function FillView({ measure, onCancel, onFinish }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const item = measure.items[index];
  const isLast = index === measure.items.length - 1;

  function setVal(id, v) {
    setAnswers((a) => ({ ...a, [id]: v }));
  }

  return (
    <>
      <SectionIntro icon={measure.icon} title={measure.label} sub={measure.full} />
      <div style={{ fontSize: 12, color: "#9C9CAE", fontWeight: 700, marginBottom: 4 }}>
        Question {index + 1} of {measure.items.length}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, lineHeight: 1.4 }}>{item.prompt}</div>

      {item.isScale ? (
        <>
          <TextField label="Activity" value={answers[item.id + "_name"]} onChange={(v) => setVal(item.id + "_name", v)} placeholder="e.g. Playing with my kids" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {Array.from({ length: 11 }, (_, n) => n).map((n) => (
              <button
                type="button"
                key={n}
                className={"grade-chip" + (String(answers[item.id]) === String(n) ? " grade-chip-active" : "")}
                style={{ flex: "0 0 44px" }}
                onClick={() => setVal(item.id, n)}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {item.options.map((opt) => {
            const active = String(answers[item.id]) === String(opt.value);
            return (
              <button
                type="button"
                key={opt.value}
                className={"suggest-card" + (active ? " suggest-card-active" : "")}
                style={{ margin: 0 }}
                onClick={() => setVal(item.id, opt.value)}
              >
                <span className="suggest-check">{active ? "●" : "○"}</span>
                <span className="suggest-title">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="bottombar" style={{ position: "static", borderTop: "none", padding: "8px 0" }}>
        <button type="button" className="ghost-btn" onClick={() => (index === 0 ? onCancel() : setIndex((i) => i - 1))}>
          ← Back
        </button>
        <button type="button" className="primary-btn" onClick={() => (isLast ? onFinish(answers) : setIndex((i) => i + 1))}>
          {isLast ? "Finish" : "Next →"}
        </button>
      </div>
    </>
  );
}

function ResultView({ measure, answers, onSave, onClose }) {
  const score = measure.score(answers);
  const interpretation = score !== null ? measure.interpret(score) : null;
  return (
    <>
      <SectionIntro icon={measure.icon} title={`${measure.label} Result`} sub={measure.full} />
      {score === null ? (
        <Hint>Some questions weren't answered — the score can't be calculated yet. Go back and complete them, or save what you have as a draft by going back to the list.</Hint>
      ) : (
        <div className="rom-card" style={{ textAlign: "center", padding: "20px 14px" }}>
          <div style={{ fontSize: 12, color: "#6B6B7A", fontWeight: 700, marginBottom: 4 }}>OVERALL SCORE</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: "#7C3AED" }}>
            {score}
            <span style={{ fontSize: 16, color: "#9C9CAE" }}>{measure.unit}</span>
          </div>
          {interpretation && (
            <div style={{ marginTop: 8, display: "inline-block", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, color: interpretation.color, background: interpretation.color + "18" }}>
              {interpretation.label}
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button type="button" className="ghost-btn" onClick={onClose}>
          Discard
        </button>
        <button type="button" className="primary-btn" disabled={score === null} onClick={() => onSave(score)}>
          Save to Assessment
        </button>
      </div>
    </>
  );
}

export default function OrthoOutcomeMeasureFlow({ data, setData, selectedRegions = [], regionLabelOf }) {
  const { instances, saveEntry } = useOutcomeData(data, setData);
  const [view, setView] = useState("list");
  const [activeId, setActiveId] = useState(null);
  const [finishedAnswers, setFinishedAnswers] = useState(null);

  const activeMeasure = activeId ? MEASURES[activeId] : null;
  // Auto-tag the saved score with a region: the measure's own region for
  // region-specific scales, or the single picked region for general ones
  // (LEFS/PSFS) when there's no ambiguity — no separate region-filter UI,
  // matching the reference app (grouped list, not a picker control).
  const activeRegionTag = activeMeasure && REGION_GROUP_LABELS[activeMeasure.region] !== REGION_GROUP_LABELS.general
    ? REGION_GROUP_LABELS[activeMeasure.region]
    : selectedRegions.length === 1 && regionLabelOf
    ? regionLabelOf(selectedRegions[0])
    : undefined;

  if (view === "fill" && activeMeasure) {
    return (
      <FillView
        measure={activeMeasure}
        onCancel={() => setView("list")}
        onFinish={(answers) => {
          setFinishedAnswers(answers);
          setView("result");
        }}
      />
    );
  }

  if (view === "result" && activeMeasure) {
    return (
      <ResultView
        measure={activeMeasure}
        answers={finishedAnswers || {}}
        onClose={() => setView("list")}
        onSave={(score) => {
          saveEntry(activeMeasure.id, finishedAnswers || {}, score, activeRegionTag);
          setView("list");
        }}
      />
    );
  }

  return (
    <ListView
      selectedRegions={selectedRegions}
      instances={instances}
      onStart={(id) => {
        setActiveId(id);
        setFinishedAnswers(null);
        setView("fill");
      }}
    />
  );
}

/* formatters[stepId] contract for orthoSummary.jsx: (section) => [{label, value}] */
export function formatOutcomeMeasureSection(section) {
  const instances = section.instances || {};
  return Object.entries(instances)
    .filter(([, inst]) => inst.history?.length)
    .map(([id, inst]) => {
      const measure = MEASURES[id];
      const latest = inst.history[inst.history.length - 1];
      const n = inst.history.length;
      const label = measure ? measure.label : id;
      return { label: latest.region ? `${label} — ${latest.region}` : label, value: `${latest.score}${measure?.unit || ""}${n > 1 ? ` (${n} assessments)` : ""}` };
    });
}

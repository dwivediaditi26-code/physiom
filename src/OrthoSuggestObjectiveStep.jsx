import React, { useMemo, useState } from "react";
import { SectionIntro, Hint } from "./orthoFieldKit.jsx";
import { suggestObjectiveTests } from "./orthoObjectiveSuggestions.js";

/* ============================================================
   OrthoSuggestObjectiveStep — "AI-assisted" objective test
   suggestion screen (Outpatient / Musculoskeletal only).

   Runs the deterministic rule engine (orthoObjectiveSuggestions.js)
   against what was documented in Subjective, shows each suggested
   test as a card with its reason, and lets the therapist accept or
   remove it with a tap. A search box below lists every other
   available test/module so anything can be added regardless of
   what was suggested — nothing here is ever locked or auto-filled.
   ============================================================ */
export default function OrthoSuggestObjectiveStep({ data, selectedRegions, condition, activeIds, onToggle, library }) {
  const [q, setQ] = useState("");

  const suggestions = useMemo(
    () => suggestObjectiveTests({ subjective: data.subjective || {}, pain: data.pain || {}, condition, selectedRegions }),
    [data.subjective, data.pain, condition, selectedRegions]
  );
  const suggestedIds = new Set(suggestions.map((s) => s.id));
  const libraryById = Object.fromEntries(library.map((it) => [it.id, it]));

  const query = q.trim().toLowerCase();
  const searchResults = query ? library.filter((it) => !suggestedIds.has(it.id) && it.label.toLowerCase().includes(query)) : [];

  return (
    <>
      <SectionIntro
        icon="🧠"
        title="Suggested Objective Assessments"
        info="Suggestions are generated from what you documented in Subjective — region, chief complaint and condition context — using a fixed set of clinical rules, not a live AI/diagnosis call. Accept, remove, or search for anything else."
      />

      {suggestions.length === 0 && <Hint>No rule-based suggestions yet — fill in Subjective first, or search below to add any assessment.</Hint>}

      {suggestions.map((s) => {
        const meta = libraryById[s.id];
        if (!meta) return null;
        const active = activeIds.has(s.id);
        return (
          <button type="button" key={s.id} className={"suggest-card" + (active ? " suggest-card-active" : "")} onClick={() => onToggle(s.id)}>
            <span className="suggest-check">{active ? "☑" : "☐"}</span>
            <span style={{ flex: 1 }}>
              <div className="suggest-title">
                {meta.icon} {meta.label}
              </div>
              <div className="suggest-reason">{s.reason}</div>
            </span>
          </button>
        );
      })}

      <div className="subheading">Search / add any other assessment</div>
      <div className="text-input-wrap" style={{ marginBottom: 10 }}>
        <input className="text-input" placeholder="🔍 Search assessment..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {query && searchResults.length === 0 && <Hint>No match — try a different term.</Hint>}
      {searchResults.map((it) => {
        const active = activeIds.has(it.id);
        return (
          <button type="button" key={it.id} className={"suggest-card" + (active ? " suggest-card-active" : "")} onClick={() => onToggle(it.id)}>
            <span className="suggest-check">{active ? "☑" : "☐"}</span>
            <span className="suggest-title">
              {it.icon} {it.label}
            </span>
          </button>
        );
      })}
    </>
  );
}

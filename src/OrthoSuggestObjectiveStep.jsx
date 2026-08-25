import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { SectionIntro, Hint } from "./orthoFieldKit.jsx";
import { suggestObjectiveTests } from "./orthoObjectiveSuggestions.js";
import { OBJECTIVE_CONTENT } from "./orthoObjectiveContent.js";

/* ============================================================
   OrthoSuggestObjectiveStep — Objective Assessment as a clean card
   list: each category shows what it is, why it matters (tap "Why?"),
   how to perform it (tap "How?"), and an Add/Added toggle -- instead
   of one long page mixing rationale paragraphs with the picker.

   Reuses the same sheet-backdrop/sheet-panel portal + CSS already
   used everywhere else in Ortho (InfoButton, "How to Perform" sheets)
   so this looks and behaves identically, just with two independent
   triggers (Why/How) instead of one combined ⓘ button.
   ============================================================ */

function Sheet({ open, onClose, eyebrow, title, children }) {
  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-eyebrow">{eyebrow}</span>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {title && <div className="sheet-title">{title}</div>}
        <div className="sheet-scroll">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function WhySheet({ open, onClose, label, content }) {
  return (
    <Sheet open={open} onClose={onClose} eyebrow="WHY THIS ASSESSMENT?" title={label}>
      <p className="obj-why-text">{content?.why}</p>
      {content?.what?.length > 0 && (
        <>
          <div className="subheading" style={{ marginTop: 4 }}>
            What it tells you
          </div>
          <ul className="obj-what-list">
            {content.what.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}

function HowSheet({ open, onClose, label, content }) {
  const how = content?.how;
  return (
    <Sheet open={open} onClose={onClose} eyebrow="HOW TO PERFORM" title={label}>
      {how ? (
        <>
          <div className="obj-how-row">
            <div className="obj-how-label">Purpose</div>
            <div className="obj-how-val">{how.purpose}</div>
          </div>
          <div className="obj-how-row">
            <div className="obj-how-label">Position</div>
            <div className="obj-how-val">{how.position}</div>
          </div>
          {how.needs?.length > 0 && (
            <div className="obj-how-row">
              <div className="obj-how-label">What you need</div>
              <ul className="obj-what-list">
                {how.needs.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          {how.steps?.length > 0 && (
            <div className="obj-how-row">
              <div className="obj-how-label">Steps</div>
              <ol className="obj-steps-list">
                {how.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </>
      ) : (
        <Hint>No structured guide for this one yet.</Hint>
      )}
    </Sheet>
  );
}

function ObjectiveCard({ id, label, reason, suggested, active, onToggle, onJump }) {
  const [sheet, setSheet] = useState(null); // null | "why" | "how"
  const content = OBJECTIVE_CONTENT[id];
  return (
    <div className={"obj-card" + (active ? " obj-card-active" : "")}>
      <div className="obj-card-top">
        <span className={"obj-card-badge" + (suggested ? " obj-card-badge-ai" : "")}>{suggested ? "✨ Suggested" : "Added by you"}</span>
        {active && <span className="obj-card-check">✓ Added</span>}
      </div>
      <div className="obj-card-title">{label}</div>
      {reason && <div className="obj-card-reason">{reason}</div>}
      <div className="obj-card-actions">
        <button type="button" className="obj-card-link" onClick={() => setSheet("why")}>
          Why?
        </button>
        <button type="button" className="obj-card-link" onClick={() => setSheet("how")}>
          How?
        </button>
        <span style={{ flex: 1 }} />
        {active ? (
          <>
            <button type="button" className="obj-card-jump" onClick={onJump}>
              Enter →
            </button>
            <button type="button" className="obj-card-remove" onClick={onToggle} aria-label="Remove">
              ✕
            </button>
          </>
        ) : (
          <button type="button" className="obj-card-add" onClick={onToggle}>
            + Add
          </button>
        )}
      </div>
      <WhySheet open={sheet === "why"} onClose={() => setSheet(null)} label={label} content={content} />
      <HowSheet open={sheet === "how"} onClose={() => setSheet(null)} label={label} content={content} />
    </div>
  );
}

export default function OrthoSuggestObjectiveStep({ data, selectedRegions, condition, activeIds, onToggle, library, onJump }) {
  const [q, setQ] = useState("");

  const suggestions = useMemo(
    () => suggestObjectiveTests({ subjective: data.subjective || {}, pain: data.pain || {}, condition, selectedRegions }),
    [data.subjective, data.pain, condition, selectedRegions]
  );
  const suggestedIds = new Set(suggestions.map((s) => s.id));
  const libraryById = Object.fromEntries(library.map((it) => [it.id, it]));

  // Anything active but not suggested (added via search, or a suggestion
  // that's since been superseded) shows in its own "Added by you" group so
  // it's never confused with an AI-generated suggestion.
  const manuallyAdded = [...activeIds].filter((id) => !suggestedIds.has(id) && libraryById[id]);

  const query = q.trim().toLowerCase();
  const searchResults = query ? library.filter((it) => !suggestedIds.has(it.id) && !activeIds.has(it.id) && it.label.toLowerCase().includes(query)) : [];

  return (
    <>
      <SectionIntro icon="🧠" title="Objective Assessment" info="Suggestions come from what you documented in Subjective and Pain — region, chief complaint, condition context — using a fixed set of clinical rules, not a live AI/diagnosis call." />

      {suggestions.length === 0 && manuallyAdded.length === 0 && <Hint>No rule-based suggestions yet — fill in Subjective first, or search below to add any assessment.</Hint>}

      {suggestions.length > 0 && <div className="subheading" style={{ marginTop: 0 }}>Suggested from your subjective</div>}
      {suggestions.map((s) => {
        const meta = libraryById[s.id];
        if (!meta) return null;
        return (
          <ObjectiveCard
            key={s.id}
            id={s.id}
            label={`${meta.icon} ${meta.label}`}
            reason={s.reason}
            suggested
            active={activeIds.has(s.id)}
            onToggle={() => onToggle(s.id)}
            onJump={() => onJump?.(s.id)}
          />
        );
      })}

      {manuallyAdded.length > 0 && <div className="subheading">Added by you</div>}
      {manuallyAdded.map((id) => {
        const meta = libraryById[id];
        return (
          <ObjectiveCard
            key={id}
            id={id}
            label={`${meta.icon} ${meta.label}`}
            suggested={false}
            active
            onToggle={() => onToggle(id)}
            onJump={() => onJump?.(id)}
          />
        );
      })}

      <div className="subheading">Search / add any other assessment</div>
      <div className="text-input-wrap" style={{ marginBottom: 10 }}>
        <input className="text-input" placeholder="🔍 Search assessment..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {query && searchResults.length === 0 && <Hint>No match — try a different term.</Hint>}
      {searchResults.map((it) => (
        <button type="button" key={it.id} className="suggest-card" onClick={() => onToggle(it.id)}>
          <span className="suggest-check">☐</span>
          <span className="suggest-title">
            {it.icon} {it.label}
          </span>
        </button>
      ))}
    </>
  );
}

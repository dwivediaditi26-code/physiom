import React, { useState } from "react";
import { REGION_GROUPS, REGION_LABEL, regionDisplayLabel, regionLabelList } from "./orthoRegionLibrary.js";

/* AI-assisted entry's 5-stage journey (Demographics / Region / Subjective /
   AI Objective / Summary) -- shown instead of the manual wizard's own full
   icon-strip + breadcrumb topbar, on both the pre-wizard screens
   (OrthoAssessment.jsx) and the in-wizard screens that follow
   (OrthoOutpatientAssessment.jsx), so a student sees one consistent header
   the whole way through instead of the chrome changing underneath them.
   Exported here (rather than living in just one of those two files) since
   both need it. */
export const AI_JOURNEY_STAGES = ["Demographics", "Region", "Subjective", "AI Objective", "Summary"];
// onJump(i), when given, is only wired up for the stages listed in
// jumpableIndices -- a stage the host component can't actually reach right
// now (e.g. tapping "Region" from inside the wizard, after Demographics/
// Region already happened pre-wizard and that screen no longer exists)
// renders as plain text, not a dead button (2026-09-16, Aditi: "when I'm
// selecting region or subjective... it should jump" -- but only where
// jumping is real, not everywhere the dot appears).
export function AiJourneyDots({ activeIndex, onJump, jumpableIndices }) {
  return (
    <div className="ai-journey-dots">
      {AI_JOURNEY_STAGES.map((label, i) => {
        const canJump = onJump && i !== activeIndex && (!jumpableIndices || jumpableIndices.has(i));
        const done = i < activeIndex;
        const active = i === activeIndex;
        const dotClass = "ai-journey-dot" + (active ? " active" : done ? " done" : "");
        const dotContent = done ? "✓" : i + 1;
        return (
          <React.Fragment key={label}>
            {i > 0 && <div className={"ai-journey-line" + (i <= activeIndex ? " done" : "")} />}
            <div className="ai-journey-step">
              {canJump ? (
                <button type="button" className={dotClass + " ai-journey-dot-btn"} onClick={() => onJump(i)} aria-label={label}>
                  {dotContent}
                </button>
              ) : (
                <div className={dotClass}>{dotContent}</div>
              )}
              {canJump ? (
                <button type="button" className="ai-journey-label ai-journey-label-btn" onClick={() => onJump(i)}>
                  {label}
                </button>
              ) : (
                <div className={"ai-journey-label" + (active ? " active" : "")}>{label}</div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* The "Summary" stage isn't one screen -- it's Problem List/Goals/
   Treatment/Sessions/Progress/Techniques/Exercise Rx/Home Protocol/Final
   Review, and Aditi doesn't want that cluster forced into a strict
   Next-Next-Next order ("we can select it from anywhere... it's not like
   it's stuck", 2026-09-16). This pill row is the non-linear nav for that
   cluster -- every item always tappable, current one highlighted, so a
   student can jump straight to Goals or back to Problems without walking
   through everything in between. */
export function AiHubNav({ items, activeId, visited, onJump }) {
  return (
    <div className="ai-hub-nav">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={"ai-hub-pill" + (it.id === activeId ? " active" : "") + (visited?.has(it.id) ? " visited" : "")}
          onClick={() => onJump(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* Renders a picker's `icon` field -- a "ti-*" string draws a Tabler
   outline glyph in a purple circle badge (2026-09-16, Aditi: "the ortho
   still have emoji... make it like svg"), anything else (an emoji string,
   the many condition-picker lists across the app) renders exactly as
   before so those aren't touched by this. */
export function PickerIcon({ icon }) {
  const isGlyph = typeof icon === "string" && icon.startsWith("ti-");
  return (
    <div className={"picker-icon" + (isGlyph ? " picker-icon-glyph" : "")}>
      {isGlyph ? <i className={"ti " + icon} aria-hidden="true"></i> : icon}
    </div>
  );
}

/* Cardio-style picker list — big tappable rows with icon + label + desc.
   Used for the Pathway screen and the Condition screen so the whole Ortho
   module reads like one design system with the Cardiopulmonary module. */
export function PickerList({ items, value, onSelect, multi }) {
  const selected = multi ? value || [] : value;
  return (
    <div className="picker-grid">
      {items.map((it) => {
        const isSel = multi ? selected.includes(it.id) : selected === it.id;
        return (
          <button key={it.id} type="button" className={"picker-card" + (isSel ? " selected" : "")} onClick={() => onSelect(it.id)}>
            <PickerIcon icon={it.icon} />
            <div>
              <div className="picker-label">{it.label}</div>
              {it.desc && <div className="picker-desc">{it.desc}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* Condition picker = PickerList + an always-present "write your own" row,
   so the template is a guide, never a restriction. */
export function ConditionPicker({ conditions, condition, setCondition, customLabel, setCustomLabel }) {
  const [writeIn, setWriteIn] = useState(!!customLabel);
  return (
    <>
      <PickerList
        items={conditions}
        value={writeIn ? null : condition}
        onSelect={(id) => {
          setWriteIn(false);
          setCustomLabel("");
          setCondition(id);
        }}
      />
      <button
        type="button"
        className={"picker-card writein-card" + (writeIn ? " selected" : "")}
        onClick={() => {
          setWriteIn(true);
          setCondition("custom");
        }}
      >
        <div className="picker-icon">✍️</div>
        <div>
          <div className="picker-label">Write in a condition</div>
          <div className="picker-desc">Not listed? Describe it in your own words.</div>
        </div>
      </button>
      {writeIn && (
        <div className="text-input-wrap" style={{ marginTop: 10 }}>
          <input className="text-input" autoFocus placeholder="e.g. Complex regional pain syndrome" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
        </div>
      )}
    </>
  );
}

/* Region multi-select with per-region Right/Left/Bilateral side chips, plus
   a write-in row for a region that isn't in the standard list — used
   identically by every Ortho module (IPD, Post-op Rehab, Outpatient, ...).
   Cards (2-column, icon + label + trailing chevron/check) instead of
   wrapping text chips (2026-09-20, Aditi: reference screenshot of a
   "Select Assessment Region" screen) -- same selected/unselected states as
   before, same multi-select + side-chip behaviour, just restyled to match. */
export function RegionPicker({ selectedRegions, setSelectedRegions, excludeIds }) {
  const [customText, setCustomText] = useState("");
  const groups = excludeIds
    ? REGION_GROUPS.map((g) => ({ ...g, items: g.items.filter((it) => !excludeIds.includes(it.id)) })).filter((g) => g.items.length > 0)
    : REGION_GROUPS;
  function toggleRegion(id) {
    setSelectedRegions((prev) => {
      const exists = prev.find((r) => r.id === id);
      if (exists) return prev.filter((r) => r.id !== id);
      return [...prev, { id, side: "" }];
    });
  }
  function setSide(id, side) {
    setSelectedRegions((prev) => prev.map((r) => (r.id === id ? { ...r, side: r.side === side ? "" : side } : r)));
  }
  function addCustom() {
    const label = customText.trim();
    if (!label) return;
    setSelectedRegions((prev) => [...prev, { id: `custom-${Date.now()}`, side: "", customLabel: label }]);
    setCustomText("");
  }
  const customRegions = selectedRegions.filter((r) => r.customLabel);
  return (
    <>
      {groups.map((g) => (
        <div key={g.group} className="region-group">
          <div className="region-group-title">{g.group.toUpperCase()}</div>
          <div className="region-grid">
            {g.items.map((it) => {
              const sel = selectedRegions.find((r) => r.id === it.id);
              return (
                <div key={it.id} className="region-card-block">
                  <button type="button" className={"region-card" + (sel ? " selected" : "")} onClick={() => toggleRegion(it.id)}>
                    <PickerIcon icon="ti-bone" />
                    <div className="region-card-label">{it.label}</div>
                    <div className={"region-card-trail" + (sel ? " region-card-check" : "")}>
                      <i className={"ti " + (sel ? "ti-check" : "ti-chevron-right")} aria-hidden="true"></i>
                    </div>
                  </button>
                  {sel && !g.sideless && (
                    <div className="side-row">
                      {["Right", "Left", "Bilateral"].map((s) => (
                        <button type="button" key={s} className={"side-chip" + (sel.side === s ? " side-chip-active" : "")} onClick={() => setSide(it.id, s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="region-group">
        <div className="region-group-title">WRITE IN A REGION</div>
        {customRegions.map((r) => (
          <div key={r.id} className="region-chip-block" style={{ marginBottom: 8 }}>
            <button type="button" className="region-chip region-chip-active" onClick={() => setSelectedRegions((prev) => prev.filter((x) => x.id !== r.id))}>
              ✓ {r.customLabel}
            </button>
          </div>
        ))}
        <div className="add-row-input">
          <input className="text-input" placeholder="e.g. Sacroiliac joint" value={customText} onChange={(e) => setCustomText(e.target.value)} />
          <button type="button" className="add-row-confirm" onClick={addCustom}>
            Add
          </button>
        </div>
      </div>
    </>
  );
}


export { REGION_LABEL, regionDisplayLabel, regionLabelList };

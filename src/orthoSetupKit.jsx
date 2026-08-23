import React, { useState } from "react";
import { REGION_GROUPS, REGION_LABEL, regionDisplayLabel, regionLabelList } from "./orthoRegionLibrary.js";

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
            <div className="picker-icon">{it.icon}</div>
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
   identically by every Ortho module (IPD, Post-op Rehab, Outpatient, ...). */
export function RegionPicker({ selectedRegions, setSelectedRegions }) {
  const [customText, setCustomText] = useState("");
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
      {REGION_GROUPS.map((g) => (
        <div key={g.group} className="region-group">
          <div className="region-group-title">{g.group.toUpperCase()}</div>
          <div className="region-chip-wrap">
            {g.items.map((it) => {
              const sel = selectedRegions.find((r) => r.id === it.id);
              return (
                <div key={it.id} className="region-chip-block">
                  <button type="button" className={"region-chip" + (sel ? " region-chip-active" : "")} onClick={() => toggleRegion(it.id)}>
                    {sel ? "✓ " : ""}
                    {it.label}
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

/* Kept for callers that still want a compact card grid (e.g. the embedded
   Setup screen inside a pathway module when used outside the unified
   3-screen picker). */
export function ConditionGrid({ conditions, condition, setCondition }) {
  return (
    <div className="condition-grid">
      {conditions.map((c) => (
        <button type="button" key={c.id} className={"condition-card" + (condition === c.id ? " condition-card-active" : "")} onClick={() => setCondition(c.id)}>
          <span className="condition-icon">{c.icon}</span>
          <span className="condition-label">{c.label}</span>
        </button>
      ))}
    </div>
  );
}

export { REGION_LABEL, regionDisplayLabel, regionLabelList };

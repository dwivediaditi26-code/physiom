import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { SectionIntro, Hint, Segmented, SelectField, TextArea, useSectionData } from "./orthoFieldKit.jsx";
import { suggestObjectiveTests } from "./orthoObjectiveSuggestions.js";
import { OBJECTIVE_CONTENT } from "./orthoObjectiveContent.js";
import { suggestIndividualItems, suggestCpaItems, defaultSideFor, romWhy, romHow, mmtWhy, mmtHow, specialWhy, specialHow, obsWhy, obsHow, cpaWhy, cpaHow } from "./orthoIndividualSuggestions.js";
import { ALL_REGIONS } from "./orthoRegionLibrary.js";
import { MMT_GRADE_OPTIONS } from "./orthoClinicalData.js";
import { contentKeyForRegion } from "./orthoSubjectiveRegionData.js";
import { runLumbarDifferential, hasLumbarChecklistData, lumbarConditionItemIds } from "./orthoLumbarReasoning.js";
import { OptionChips } from "./orthoAdvancedTools.jsx";
import { MEASURES, suggestMeasures } from "./orthoOutcomeMeasureData.js";

/* ============================================================
   OrthoSuggestObjectiveStep — Objective Assessment as a list of
   fillable items, not a picker for whole categories. For the four
   categories with a real named-item library (Observation/ROM/MMT/
   Special Tests), each individual item (e.g. "Lachman's Test",
   "Quadriceps", "Knee flexion", "Scapula") gets its own card with
   an (i) info button and its real inline answer control -- writing straight
   into the exact field the full ROM/MMT/Special Tests/Observation
   page reads, via the same useSectionData sections those pages use.
   Everything else (edema, neuro screen, kinetic chain, ...) doesn't
   have that same per-item library, so it stays a whole-category
   suggestion card, same as before.
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

// One combined sheet per item -- Why (whyLines) and How (howLines) stacked
// under one (i) trigger, instead of two separate "Why?"/"How?" text links.
function LineInfoSheet({ open, onClose, label, whyLines, howLines, howEyebrow = "How to perform" }) {
  const whyEmpty = Array.isArray(whyLines) ? whyLines.length === 0 : !whyLines;
  const howEmpty = !howLines || howLines.length === 0;
  return (
    <Sheet open={open} onClose={onClose} eyebrow="ABOUT THIS TEST" title={label}>
      {whyEmpty && howEmpty ? (
        <Hint>No additional reference notes for this one yet.</Hint>
      ) : (
        <>
          {!whyEmpty && (
            <>
              <div className="subheading" style={{ marginTop: 0 }}>Why this test</div>
              {Array.isArray(whyLines) ? (
                <ul className="obj-what-list">
                  {whyLines.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              ) : (
                <p className="obj-why-text">{whyLines}</p>
              )}
            </>
          )}
          {!howEmpty && (
            <>
              <div className="subheading">{howEyebrow}</div>
              <ul className="obj-what-list">
                {howLines.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

/* ---------- Whole-category cards (edema, neuroScreen, kineticChain, ...) ---------- */

// Same merge for the whole-category cards -- one (i) trigger opens why +
// what-it-tells-you + the structured how-to-perform detail together.
function InfoSheet({ open, onClose, label, content }) {
  const how = content?.how;
  const isEmpty = !content?.why && !content?.what?.length && !how;
  return (
    <Sheet open={open} onClose={onClose} eyebrow="ABOUT THIS ASSESSMENT" title={label}>
      {isEmpty ? (
        <Hint>No additional reference notes for this one yet.</Hint>
      ) : (
        <>
          {content?.why && <p className="obj-why-text">{content.why}</p>}
          {content?.what?.length > 0 && (
            <>
              <div className="subheading" style={{ marginTop: 4 }}>What it tells you</div>
              <ul className="obj-what-list">
                {content.what.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </>
          )}
          {how && (
            <>
              <div className="subheading">How to perform</div>
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
                    {how.needs.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}
              {how.steps?.length > 0 && (
                <div className="obj-how-row">
                  <div className="obj-how-label">Steps</div>
                  <ol className="obj-steps-list">
                    {how.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

// Key for the persisted objectiveSelection map -- one key per named
// Observation/ROM/MMT/Special Test item, shared by the item card that owns
// it and the top-level findings/tray/review logic below.
function itemKey(type, regionKey, itemId) {
  return `${type}:${regionKey}:${itemId}`;
}

const MATCH_TIER_TONE = {
  "Strong match": "#16a34a",
  "Possible match": "#d97706",
  "Weak match": "#6b7280",
  "Insufficient data": "#9ca3af",
  "Unlikely": "#9ca3af",
};

// Real match percentage from lumbarReasoningEngine.js's own count -- not a
// new score, just supportingMatched/supportingTotal expressed as a percent
// for the card badge.
function conditionMatchPct(condition) {
  const total = condition.supportingTotal;
  if (!total) return null;
  return Math.round((condition.supportingMatched.length / total) * 100);
}

/* Possible-Matches row -- the same real L01-L11 differential from
   lumbarReasoningEngine.js (via orthoLumbarReasoning.js), now shown as
   compact swipeable condition cards (name + match %) instead of a stack of
   always-expandable rows. Purely informational: tapping a card only swaps
   which condition's supporting/refuting detail is shown below -- it never
   adds or removes anything from the objective list itself. */
function ConditionMatchRow({ conditions, activeId, onSelect }) {
  return (
    <div className="obj-match-row">
      {conditions.map((c) => {
        const pct = conditionMatchPct(c);
        return (
          <button
            type="button"
            key={c.id}
            className={"obj-match-card" + (activeId === c.id ? " obj-match-card-active" : "")}
            onClick={() => onSelect(c.id === activeId ? null : c.id)}
          >
            {pct != null ? <span className="obj-match-pct">{pct}%</span> : <span className="obj-match-pct" style={{ color: MATCH_TIER_TONE[c.matchTier] }}>{c.matchTier}</span>}
            <span className="obj-match-name">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function ConditionDetailPanel({ condition }) {
  const [open, setOpen] = useState(false);
  if (!condition) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <button type="button" className="obj-card-link" onClick={() => setOpen((o) => !o)}>
        {open ? "Hide match detail" : "Why this match? →"}
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          {condition.note && <div className="obj-card-reason" style={{ marginBottom: 8 }}>{condition.note}</div>}
          {condition.supportingMatched.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div className="subheading" style={{ margin: "0 0 4px", fontSize: 11 }}>Supporting findings</div>
              {condition.supportingMatched.map((f, i) => <div key={i} style={{ fontSize: 12.5, color: "#166534", marginBottom: 2 }}>✓ {f}</div>)}
            </div>
          )}
          {condition.refutingMatched.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div className="subheading" style={{ margin: "0 0 4px", fontSize: 11 }}>Against</div>
              {condition.refutingMatched.map((f, i) => <div key={i} style={{ fontSize: 12.5, color: "#991b1b", marginBottom: 2 }}>✗ {f}</div>)}
            </div>
          )}
          {condition.unknownCount > 0 && (
            <Hint>{condition.unknownCount} item(s) not yet answered in the Lumbar/SI checklist — filling those in will sharpen this match.</Hint>
          )}
          {condition.objectiveTests?.required?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="subheading" style={{ margin: "0 0 4px", fontSize: 11 }}>Recommended objective tests</div>
              {condition.objectiveTests.required.map((t, i) => <div key={i} style={{ fontSize: 12.5, color: "#1e293b", marginBottom: 2 }}>• {t}</div>)}
              {condition.objectiveTests.recommended?.map((t, i) => <div key={"r" + i} style={{ fontSize: 12.5, color: "#64748b", marginBottom: 2 }}>• {t}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ObjectiveCard({ id, label, reason, suggested, active, onToggle, onJump }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const content = OBJECTIVE_CONTENT[id];
  return (
    <div className={"obj-card" + (active ? " obj-card-active" : "")}>
      <div className="obj-card-top">
        <span className={"obj-card-badge" + (suggested ? " obj-card-badge-ai" : "")}>{suggested ? "✨ Suggested" : "Added by you"}</span>
        {active && <span className="obj-card-check">✓ Added</span>}
      </div>
      <div className="obj-card-title">
        {label}
        <button type="button" className="info-btn-sm" onClick={() => setInfoOpen(true)} aria-label={`About ${label}`}>
          ⓘ
        </button>
      </div>
      {reason && <div className="obj-card-reason">{reason}</div>}
      <div className="obj-card-actions">
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
      <InfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} label={label} content={content} />
    </div>
  );
}

/* ---------- Individual-item cards (ROM / MMT / Special Tests / Observation) ---------- */

// Collapsed by default -- a single compact row (name + optional value
// summary + an (i) info button) -- expanding only the actual input widget
// (`children`) on tap. Previously every named item (every ROM movement,
// every MMT muscle, every special test) rendered its FULL input widget
// inline and always expanded, which is what made a single Suggested
// Objective step run 6000+px of scroll for one region. The (i) button sits
// right beside the item name (was two separate "Why?"/"How?" text links)
// so a clinician can still learn about a test without opening it to fill
// it in.
// `selected` defaults to true so callers that never pass it (Palpation,
// which is always a base step, not part of the Suggested->Selected->Finding
// gate) keep the old always-expandable behavior unchanged. Callers that DO
// pass selected/onSelect (Rom/Mmt/SpecialTest/Observation) get the three-state
// row: plain "+ Select" button -> tap opens the real input -> an answer that
// is itself a positive/abnormal/recorded result turns the row green (finding).
function ItemCardShell({ label, sublabel, answered, summary, whyLines, howLines, howEyebrow = "How to perform", selected = true, onSelect, finding = false, children }) {
  const [open, setOpen] = useState(selected && !answered);
  const [infoOpen, setInfoOpen] = useState(false);
  function handleRowClick() {
    if (!selected) { onSelect?.(); setOpen(true); return; }
    setOpen((o) => !o);
  }
  const stateClass = finding ? " obj-item-finding" : selected && answered ? " obj-item-answered" : selected ? " obj-item-selected" : "";
  return (
    <div className={"obj-item" + stateClass}>
      <div className="obj-item-row" onClick={handleRowClick} role="button">
        <div className="obj-item-row-label">
          <span className="obj-item-row-name">{label}</span>
          <button type="button" className="info-btn-sm" onClick={(e) => { e.stopPropagation(); setInfoOpen(true); }} aria-label={`About ${label}`}>
            ⓘ
          </button>
          {sublabel && <span className="obj-item-row-sub">{sublabel}</span>}
        </div>
        <div className="obj-item-row-right">
          {selected && answered && summary && <span className="obj-item-row-summary">{finding ? "✓ " : ""}{summary}</span>}
          {!selected ? (
            <button type="button" className="obj-item-select-btn" onClick={(e) => { e.stopPropagation(); onSelect?.(); setOpen(true); }}>
              + Select
            </button>
          ) : (
            <span className={"obj-item-chevron" + (open ? " open" : "")}>⌄</span>
          )}
        </div>
      </div>
      {selected && open && (
        <div className="obj-item-body" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
      <LineInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} label={label} whyLines={whyLines} howLines={howLines} howEyebrow={howEyebrow} />
    </div>
  );
}

function RomItemCard({ item, romData, setRom, selectionData, onSelectItem }) {
  const { regionKey, itemId, label, meta } = item;
  const entry = romData[regionKey] || {};
  const val = entry[itemId] || {};
  const key = itemKey("rom", regionKey, itemId);
  function setSide(side, v) {
    setRom(regionKey, { ...entry, [itemId]: { ...val, [side]: v } });
    onSelectItem(key);
  }
  const answered = val.left || val.right;
  const selected = !!selectionData[key] || !!answered;
  const norm = meta.normal != null ? `N=${meta.normal}${meta.unit || "°"}` : null;
  const unit = meta.unit || "°";
  const summary = [val.left && `L ${val.left}${unit}`, val.right && `R ${val.right}${unit}`].filter(Boolean).join(" / ");
  return (
    <ItemCardShell label={label} sublabel={[meta.plane, norm].filter(Boolean).join(" · ")} answered={!!answered} summary={summary} whyLines={romWhy(meta)} howLines={romHow(meta)} selected={selected} onSelect={() => onSelectItem(key)} finding={!!answered}>
      <div className="obj-item-lr">
        <label className="obj-item-lr-field">
          <span>L</span>
          <input type="number" placeholder="--" value={val.left ?? ""} onChange={(e) => setSide("left", e.target.value)} />
        </label>
        {meta.bilateral !== false && (
          <label className="obj-item-lr-field">
            <span>R</span>
            <input type="number" placeholder="--" value={val.right ?? ""} onChange={(e) => setSide("right", e.target.value)} />
          </label>
        )}
        <span className="obj-item-unit">{meta.unit || "°"}</span>
      </div>
    </ItemCardShell>
  );
}

function MmtItemCard({ item, mmtData, setMmt, selectionData, onSelectItem }) {
  const { regionKey, itemId, label, meta } = item;
  const entry = mmtData[regionKey] || {};
  const val = entry[itemId] || {};
  const key = itemKey("mmt", regionKey, itemId);
  function setSide(side, v) {
    setMmt(regionKey, { ...entry, [itemId]: { ...val, [side]: v } });
    onSelectItem(key);
  }
  const answered = val.left || val.right;
  const selected = !!selectionData[key] || !!answered;
  const weak = (val.left && val.left !== "5") || (val.right && val.right !== "5");
  const summary = [val.left && `L ${val.left}`, val.right && `R ${val.right}`].filter(Boolean).join(" / ");
  return (
    <ItemCardShell label={label} sublabel={[meta.nerve, meta.root].filter(Boolean).join(" · ")} answered={!!answered} summary={summary} whyLines={mmtWhy(meta)} howLines={mmtHow(meta)} selected={selected} onSelect={() => onSelectItem(key)} finding={!!answered && !!weak}>
      <div className="obj-item-lr">
        <label className="obj-item-lr-field">
          <span>L</span>
          <select value={val.left || ""} onChange={(e) => setSide("left", e.target.value)}>
            <option value="">--</option>
            {MMT_GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="obj-item-lr-field">
          <span>R</span>
          <select value={val.right || ""} onChange={(e) => setSide("right", e.target.value)}>
            <option value="">--</option>
            {MMT_GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>
    </ItemCardShell>
  );
}

function SpecialTestItemCard({ item, specialData, setSpecial, selectedRegions, isSideless, selectionData, onSelectItem }) {
  const { regionKey, itemId, label, meta } = item;
  const entry = specialData[regionKey] || {};
  const raw = entry[itemId];
  const key = itemKey("special", regionKey, itemId);
  const currentSide = isSideless ? null : entry[itemId + "__side"] || defaultSideFor(regionKey, selectedRegions);
  const currentValue = isSideless ? raw : raw && typeof raw === "object" ? raw[currentSide] : undefined;
  function setResult(optionValue) {
    if (isSideless) {
      setSpecial(regionKey, { ...entry, [itemId]: optionValue });
    } else {
      const obj = raw && typeof raw === "object" ? raw : {};
      setSpecial(regionKey, { ...entry, [itemId]: { ...obj, [currentSide]: optionValue } });
    }
    onSelectItem(key);
  }
  function setSideChip(s) {
    setSpecial(regionKey, { ...entry, [itemId + "__side"]: s });
  }
  const options = meta.options || ["Negative", "Positive"];
  const baseline = options[0];
  const answered = isSideless ? !!raw : !!(raw && typeof raw === "object" && raw[currentSide]);
  const selected = !!selectionData[key] || answered;
  const summary = answered ? [currentSide && !isSideless ? currentSide[0].toUpperCase() + currentSide.slice(1) : null, currentValue].filter(Boolean).join(" — ") : "";
  return (
    <ItemCardShell label={label} sublabel={meta.structure} answered={answered} summary={summary} whyLines={specialWhy(meta)} howLines={specialHow(meta)} selected={selected} onSelect={() => onSelectItem(key)} finding={answered && currentValue !== baseline}>
      {!isSideless && (
        <div className="obj-item-side-row">
          {["Right", "Left", "Bilateral"].map((s) => (
            <button type="button" key={s} className={"side-chip" + (currentSide === s.toLowerCase() ? " side-chip-active" : "")} onClick={() => setSideChip(s.toLowerCase())}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="test-radio-row">
        {options.map((o) => {
          const isActive = currentValue === o;
          return (
            <button type="button" key={o} className={"test-radio" + (isActive ? " test-radio-selected" : "")} onClick={() => setResult(isActive ? "" : o)}>
              {o}
            </button>
          );
        })}
      </div>
    </ItemCardShell>
  );
}

function ObservationItemCard({ item, obsData, setPostureRegion, selectionData, onSelectItem }) {
  const { regionKey, itemId, label, meta } = item;
  const view = meta.view;
  const regions = obsData.posture?.regions || {};
  const viewData = regions[regionKey]?.[view] || {};
  const value = viewData[itemId];
  const key = itemKey("observation", regionKey, `${view}:${itemId}`);
  const selected = !!selectionData[key] || !!value;
  function pick(o) {
    setPostureRegion(regionKey, view, itemId, value === o ? "" : o);
    onSelectItem(key);
  }
  return (
    <ItemCardShell label={label} answered={!!value} summary={value || ""} whyLines={obsWhy(meta)} howLines={obsHow()} selected={selected} onSelect={() => onSelectItem(key)} finding={!!value && value !== meta.options?.[0]}>
      <div className="test-radio-row">
        {(meta.options || []).map((o) => (
          <button type="button" key={o} className={"test-radio" + (value === o ? " test-radio-selected" : "")} onClick={() => pick(o)}>
            {o}
          </button>
        ))}
      </div>
    </ItemCardShell>
  );
}

/* ---------- Palpation (always a base step, so always shown here -- not
   part of the suggested/optional library like CPA/Outcome Measure below).
   Only the 4 flat structured findings fields (writes to the exact same
   data.palpation fields PalpationSection reads/writes) -- the interactive
   body map stays on the full Palpation page, linked below rather than
   duplicated inline. ---------- */
function PalpationInlineCard({ palpationData, setPalpation }) {
  const d = palpationData;
  const answered = !!(d.swelling || d.muscleTone?.length || d.triggerPoints || d.scarMobility?.length);
  const summary = [d.swelling, d.muscleTone, d.scarMobility].filter(Boolean).join(" · ");
  return (
    <ItemCardShell
      label="Palpation findings"
      answered={answered}
      summary={summary}
      whyLines="Swelling, tone, trigger points, and scar/tissue mobility help localize the tissue source and guide manual treatment technique choice."
      howLines={["Palpate systematically over and around the affected region, comparing bilaterally where possible.", "Use the full Palpation page for pin-by-pin structure/tenderness detail on the body map."]}
      howEyebrow="HOW TO PALPATE"
    >
      <Segmented label="Swelling" options={["None", "Mild", "Moderate", "Severe"]} value={d.swelling} onChange={(v) => setPalpation("swelling", v)} />
      <SelectField label="Muscle tone" type="multi" options={["Normal", "Hypertonic", "Hypotonic", "Spasm", "Guarding"]} value={d.muscleTone} onChange={(v) => setPalpation("muscleTone", v)} />
      <TextArea label="Trigger points" value={d.triggerPoints} onChange={(v) => setPalpation("triggerPoints", v)} placeholder="Location and referral pattern..." />
      <SelectField label="Scar / tissue mobility" type="multi" options={["N/A", "Normal", "Adherent", "Restricted", "Hypersensitive"]} value={d.scarMobility} onChange={(v) => setPalpation("scarMobility", v)} />
    </ItemCardShell>
  );
}

/* ---------- CPA (Compensation Pattern Analysis / NKT) -- suggested/
   optional, same as before, but now an inline per-test item list (colored
   Facilitated/Inhibited/Overactive chips) instead of an "Enter →" jump. ---------- */
function CpaItemCard({ item, cpaData, setCpa }) {
  const { regionKey, itemId, label, meta } = item;
  const entry = cpaData[regionKey] || {};
  const value = entry[itemId];
  return (
    <ItemCardShell label={label} sublabel={meta.muscle} answered={!!value} summary={value || ""} whyLines={cpaWhy(meta)} howLines={cpaHow(meta)} howEyebrow="HOW TO TEST">
      <OptionChips options={meta.options} value={value} onChange={(v) => setCpa(regionKey, { ...entry, [itemId]: v })} />
    </ItemCardShell>
  );
}

/* ---------- Outcome Measure -- suggested/optional, same as before, but
   now the actual question set fills inline (one collapsible card per
   suggested measure) instead of an "Enter →" jump. Writes to the exact
   same data.outcomeMeasure.instances[measureId].history shape
   OrthoOutcomeMeasureFlow.jsx's own saveEntry() produces, so a "Reassess"
   later on the full page sees this entry as real history, not a
   duplicate. A discrete "Save entry" action (rather than live-writing
   each answer) because a half-answered scale has no valid score and an
   instrument's history is meant to be a series of complete, timestamped
   administrations, not a rolling draft. ---------- */
function OutcomeMeasureInlineCard({ measure, reason, instance, onSave }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState({});
  const score = measure.score(answers);
  const interp = score != null ? measure.interpret(score) : null;
  const history = instance?.history || [];
  const latest = history[history.length - 1];
  const hasHistory = history.length > 0;
  function pick(itemId, value) {
    setAnswers((a) => ({ ...a, [itemId]: a[itemId] === value ? undefined : value }));
  }
  function save() {
    onSave(measure.id, answers, score);
    setAnswers({});
  }
  return (
    <div className="obj-item">
      <div className="obj-item-row" onClick={() => setOpen((o) => !o)} role="button">
        <div className="obj-item-row-label">
          <span className="obj-item-row-name">
            {measure.icon} {measure.label}
          </span>
          <span className="obj-item-row-sub">{measure.full}</span>
        </div>
        <div className="obj-item-row-right">
          {hasHistory && (
            <span className="obj-item-row-summary">
              Last: {latest.score}
              {measure.unit}
            </span>
          )}
          <span className={"obj-item-chevron" + (open ? " open" : "")}>⌄</span>
        </div>
      </div>
      {open && (
        <div className="obj-item-body" onClick={(e) => e.stopPropagation()}>
          {reason && (
            <div className="obj-card-reason" style={{ marginBottom: 8 }}>
              {reason}
            </div>
          )}
          {measure.items.map((it) => (
            <div key={it.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, color: "#334155", marginBottom: 4 }}>{it.prompt}</div>
              <div className="test-radio-row">
                {it.options.map((o) => (
                  <button type="button" key={o.value} className={"test-radio" + (answers[it.id] === o.value ? " test-radio-selected" : "")} onClick={() => pick(it.id, o.value)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="obj-card-actions" style={{ marginTop: 4 }}>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: interp?.color || "#64748b" }}>{score != null ? `Score: ${score}${measure.unit} — ${interp.label}` : "Answer every item to see the score"}</span>
            <button type="button" className="obj-card-add" disabled={score == null} onClick={save}>
              💾 Save entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrthoSuggestObjectiveStep({ data, setData, selectedRegions, condition, activeIds, onToggle, library, onJump }) {
  const [q, setQ] = useState("");
  const [findingsOpen, setFindingsOpen] = useState(false);
  const [activeConditionId, setActiveConditionId] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);

  const [romData, setRomD] = useSectionData(data, setData, "rom");
  const [mmtData, setMmtD] = useSectionData(data, setData, "mmt");
  const [specialData, setSpecialD] = useSectionData(data, setData, "specialTests");
  const [obsData, setObsD] = useSectionData(data, setData, "observation");
  const [palpationData, setPalpationD] = useSectionData(data, setData, "palpation");
  const [cpaData, setCpaD] = useSectionData(data, setData, "cpa");
  const [omData, setOmD] = useSectionData(data, setData, "outcomeMeasure");
  // Persists which items have been tapped "+ Select" so the Suggested /
  // Selected / Finding state survives navigating away and back -- an item
  // that already has a saved answer counts as selected even without an
  // entry here (see the `selected = !!selectionData[key] || answered`
  // pattern in each item card / in findingsAndSelection below).
  const [selectionData, setSelectionField] = useSectionData(data, setData, "objectiveSelection");
  function onSelectItem(key) {
    if (!selectionData[key]) setSelectionField(key, true);
  }
  const setRom = (k, v) => setRomD(k, v);
  const setMmt = (k, v) => setMmtD(k, v);
  const setSpecial = (k, v) => {
    setSpecialD(k, v);
    if (!activeIds.has("specialTests")) onToggle("specialTests");
  };
  const setPalpation = (k, v) => setPalpationD(k, v); // always a base step -- no activeIds toggle needed
  const setCpa = (k, v) => {
    setCpaD(k, v);
    if (!activeIds.has("cpa")) onToggle("cpa");
  };
  const omInstances = omData.instances || {};
  function saveOutcomeEntry(measureId, answers, score) {
    const history = [...(omInstances[measureId]?.history || []), { score, date: new Date().toISOString(), answers }].slice(-10);
    setOmD("instances", { ...omInstances, [measureId]: { history } });
    if (!activeIds.has("outcomeMeasure")) onToggle("outcomeMeasure");
  }
  const setPostureRegion = (regionKey, view, fieldId, value) => {
    const posture = obsData.posture || {};
    const regions = posture.regions || {};
    const regionData = regions[regionKey] || {};
    const viewData = regionData[view] || {};
    setObsD("posture", { ...posture, regions: { ...regions, [regionKey]: { ...regionData, [view]: { ...viewData, [fieldId]: value } } } });
  };

  const isSideless = (regionKey) => !!ALL_REGIONS.find((r) => r.id === regionKey)?.sideless;

  const { rom, mmt, specialTests, observation } = useMemo(() => suggestIndividualItems(selectedRegions), [selectedRegions]);

  const suggestions = useMemo(
    () => suggestObjectiveTests({ subjective: data.subjective || {}, pain: data.pain || {}, condition, selectedRegions }).filter((s) => !["rom", "mmt", "specialTests"].includes(s.id)),
    [data.subjective, data.pain, condition, selectedRegions]
  );

  // CPA and Outcome Measure are optional (unlike ROM/MMT/Special
  // Tests/Palpation, which are always relevant) -- only fill inline once
  // suggested by suggestObjectiveTests/suggestMeasures or already added,
  // same gating the old whole-category "Enter →" card used.
  const cpaReason = suggestions.find((s) => s.id === "cpa")?.reason;
  const showCpa = !!cpaReason || activeIds.has("cpa");
  const cpaItems = useMemo(() => (showCpa ? suggestCpaItems(selectedRegions) : []), [showCpa, selectedRegions]);

  const { recommended: omRecommended } = useMemo(() => suggestMeasures({ selectedRegions, contentKeyForRegion }), [selectedRegions]);
  const omReasonById = Object.fromEntries(omRecommended.map((r) => [r.id, r.reason]));
  const omSuggestedFromReasoning = suggestions.find((s) => s.id === "outcomeMeasure")?.reason;
  const showOutcomeMeasure = omRecommended.length > 0 || !!omSuggestedFromReasoning || activeIds.has("outcomeMeasure");
  const outcomeMeasureIds = showOutcomeMeasure ? [...new Set([...omRecommended.map((r) => r.id), ...(activeIds.has("outcomeMeasure") ? Object.keys(omInstances) : [])])] : [];
  const lumbarRegion = selectedRegions.find((r) => contentKeyForRegion(r) === "lumbarSI");
  const lumbarRegionData = lumbarRegion && data.subjective?.regions?.[lumbarRegion.id];
  const lumbarResult = useMemo(() => {
    if (!lumbarRegion || !hasLumbarChecklistData(lumbarRegionData)) return null;
    try { return runLumbarDifferential(lumbarRegionData, data.subjective || {}); } catch { return null; }
  }, [lumbarRegion, lumbarRegionData, data.subjective]);

  const suggestedIds = new Set(suggestions.map((s) => s.id));
  const libraryById = Object.fromEntries(library.map((it) => [it.id, it]));
  // cpa/outcomeMeasure now fill inline above (like rom/mmt/specialTests) --
  // excluded here (and from `suggestions` below at render time) so they
  // don't also duplicate as a whole-category "Enter →" card. Kept in
  // `suggestions` itself since cpaReason/omSuggestedFromReasoning above
  // still read their `reason` text off it.
  const manuallyAdded = [...activeIds].filter((id) => !suggestedIds.has(id) && !["cpa", "outcomeMeasure"].includes(id) && libraryById[id]);
  const otherSuggestions = suggestions.filter((s) => !["cpa", "outcomeMeasure"].includes(s.id));

  const query = q.trim().toLowerCase();
  const searchResults = query ? library.filter((it) => !suggestedIds.has(it.id) && !activeIds.has(it.id) && it.label.toLowerCase().includes(query)) : [];

  const topConditions = useMemo(
    () => (lumbarResult ? lumbarResult.conditions.filter((c) => c.matchTier !== "Unlikely").slice(0, 3) : []),
    [lumbarResult]
  );
  const activeConditionIdOrDefault = activeConditionId ?? topConditions[0]?.id ?? null;
  const activeConditionObj = topConditions.find((c) => c.id === activeConditionIdOrDefault) || null;
  // Narrows the suggested Observation/ROM/MMT/Special Tests lists down to
  // what THIS condition's own objectiveTests actually cover, instead of
  // always showing the region's entire test library regardless of which
  // condition is suspected -- null (no condition matched/selected, or a
  // region without a ported Phase 0.5 engine) means "show everything",
  // same as before this existed.
  const conditionFilter = useMemo(() => (activeConditionObj ? lumbarConditionItemIds(activeConditionObj) : null), [activeConditionObj]);

  // Scans the exact same rom/mmt/specialTests/observation data the item
  // cards above write into, and derives (a) which named items are
  // "selected" (explicitly tapped, or already answered from a previous
  // visit) and (b) which of those answers are themselves a positive,
  // abnormal, or recorded result -- a Finding. No separate state to keep in
  // sync: the drawer, the sticky tray, and the review screen all read this
  // one derived list.
  const { findings, selectedKeys } = useMemo(() => {
    const findingsOut = [];
    const keys = new Set();

    observation.forEach((item) => {
      const key = itemKey("observation", item.regionKey, `${item.meta.view}:${item.itemId}`);
      const regions = obsData.posture?.regions || {};
      const value = regions[item.regionKey]?.[item.meta.view]?.[item.itemId];
      if (!selectionData[key] && !value) return;
      keys.add(key);
      if (value && value !== item.meta.options?.[0]) findingsOut.push({ key, label: `${item.label} — ${value}` });
    });

    rom.forEach((item) => {
      const key = itemKey("rom", item.regionKey, item.itemId);
      const v = (romData[item.regionKey] || {})[item.itemId] || {};
      const answered = !!(v.left || v.right);
      if (!selectionData[key] && !answered) return;
      keys.add(key);
      if (answered) {
        const unit = item.meta.unit || "°";
        const parts = [v.left && `L ${v.left}${unit}`, v.right && `R ${v.right}${unit}`].filter(Boolean).join(" / ");
        findingsOut.push({ key, label: `${item.label} — ${parts}` });
      }
    });

    mmt.forEach((item) => {
      const key = itemKey("mmt", item.regionKey, item.itemId);
      const v = (mmtData[item.regionKey] || {})[item.itemId] || {};
      const answered = !!(v.left || v.right);
      if (!selectionData[key] && !answered) return;
      keys.add(key);
      const weak = (v.left && v.left !== "5") || (v.right && v.right !== "5");
      if (answered && weak) {
        const parts = [v.left && v.left !== "5" && `L ${v.left}/5`, v.right && v.right !== "5" && `R ${v.right}/5`].filter(Boolean).join(" / ");
        findingsOut.push({ key, label: `${item.label} weak — ${parts}` });
      }
    });

    specialTests.forEach((item) => {
      const key = itemKey("special", item.regionKey, item.itemId);
      const sideless = isSideless(item.regionKey);
      const specialEntry = specialData[item.regionKey] || {};
      const raw = specialEntry[item.itemId];
      const side = sideless ? null : specialEntry[item.itemId + "__side"] || defaultSideFor(item.regionKey, selectedRegions);
      const currentValue = sideless ? raw : raw && typeof raw === "object" ? raw[side] : undefined;
      const answered = sideless ? !!raw : !!(raw && typeof raw === "object" && raw[side]);
      if (!selectionData[key] && !answered) return;
      keys.add(key);
      const baseline = item.meta.options?.[0] || "Negative";
      if (answered && currentValue !== baseline) {
        findingsOut.push({ key, label: `${item.label} — ${currentValue}${side && !sideless ? ` (${side})` : ""}` });
      }
    });

    return { findings: findingsOut, selectedKeys: keys };
  }, [observation, rom, mmt, specialTests, obsData, romData, mmtData, specialData, selectionData, selectedRegions]);

  const activeOtherSuggestions = otherSuggestions.filter((s) => activeIds.has(s.id));
  const reviewObservation = observation.filter((item) => selectedKeys.has(itemKey("observation", item.regionKey, `${item.meta.view}:${item.itemId}`)));
  const reviewRom = rom.filter((item) => selectedKeys.has(itemKey("rom", item.regionKey, item.itemId)));
  const reviewMmt = mmt.filter((item) => selectedKeys.has(itemKey("mmt", item.regionKey, item.itemId)));
  const reviewSpecial = specialTests.filter((item) => selectedKeys.has(itemKey("special", item.regionKey, item.itemId)));

  // Suggest-screen lists only -- narrowed by conditionFilter (see above),
  // but never hides an item that's already selected/answered just because
  // the therapist switched to a different condition tab afterwards.
  function passesConditionFilter(type, itemId) {
    if (!conditionFilter) return true;
    if (type === "observation") return conditionFilter.showObservation;
    if (type === "rom") return conditionFilter.rom.has(itemId);
    if (type === "mmt") return conditionFilter.mmt.has(itemId);
    if (type === "special") return conditionFilter.special.has(itemId);
    return true;
  }
  const visibleObservation = observation.filter((item) => selectedKeys.has(itemKey("observation", item.regionKey, `${item.meta.view}:${item.itemId}`)) || passesConditionFilter("observation", item.itemId));
  const visibleRom = rom.filter((item) => selectedKeys.has(itemKey("rom", item.regionKey, item.itemId)) || passesConditionFilter("rom", item.itemId));
  const visibleMmt = mmt.filter((item) => selectedKeys.has(itemKey("mmt", item.regionKey, item.itemId)) || passesConditionFilter("mmt", item.itemId));
  const visibleSpecial = specialTests.filter((item) => selectedKeys.has(itemKey("special", item.regionKey, item.itemId)) || passesConditionFilter("special", item.itemId));

  const traySelectionCount = selectedKeys.size + manuallyAdded.length + activeOtherSuggestions.length;
  const trayLabels = [
    ...reviewObservation.map((item) => item.label),
    ...reviewRom.map((item) => item.label),
    ...reviewMmt.map((item) => item.label),
    ...reviewSpecial.map((item) => item.label),
    ...manuallyAdded.map((id) => libraryById[id]?.label).filter(Boolean),
    ...activeOtherSuggestions.map((s) => libraryById[s.id]?.label).filter(Boolean),
  ];

  const findingsBlock = (
    <>
      <button type="button" className={"obj-findings-toggle" + (findingsOpen ? " open" : "")} onClick={() => setFindingsOpen((o) => !o)}>
        <span>🗂 Objective findings · {findings.length}</span>
        <span className="obj-findings-chev">⌄</span>
      </button>
      {findingsOpen && (
        findings.length > 0 ? (
          <div className="obj-findings-drawer">
            {findings.map((f) => <div key={f.key}><b>✓</b>{f.label}</div>)}
          </div>
        ) : (
          <div className="obj-findings-empty">Nothing recorded yet — a finding appears here the moment a result is positive, abnormal, or measured.</div>
        )
      )}
    </>
  );

  if (reviewMode) {
    return (
      <div className="obj-no-zoom">
        <div className="obj-review-head">
          <button type="button" className="obj-review-back" onClick={() => setReviewMode(false)}>← Back to suggestions</button>
        </div>
        <SectionIntro icon="📋" title="Assessment" info={`${traySelectionCount} test(s) selected. Everything below writes to the exact same fields as the full Rom/MMT/Special Tests/Observation pages.`} />

        <div className="obj-review-findings">
          <h4>Objective findings — {findings.length}</h4>
          {findings.length > 0 ? findings.map((f) => <div key={f.key}><b>✓</b>{f.label}</div>) : <div style={{ color: "#9ca3af" }}>No positive findings yet.</div>}
        </div>

        {reviewObservation.length > 0 && (
          <>
            <div className="subheading" style={{ marginTop: 0 }}>👁️ Observation</div>
            {reviewObservation.map((item) => (
              <ObservationItemCard key={`obs-${item.regionKey}-${item.itemId}`} item={item} obsData={obsData} setPostureRegion={setPostureRegion} selectionData={selectionData} onSelectItem={onSelectItem} />
            ))}
          </>
        )}
        {reviewRom.length > 0 && (
          <>
            <div className="subheading">📐 Range of Motion</div>
            {reviewRom.map((item) => (
              <RomItemCard key={`rom-${item.regionKey}-${item.itemId}`} item={item} romData={romData} setRom={setRom} selectionData={selectionData} onSelectItem={onSelectItem} />
            ))}
          </>
        )}
        {reviewMmt.length > 0 && (
          <>
            <div className="subheading">💪 Muscle Strength (MMT)</div>
            {reviewMmt.map((item) => (
              <MmtItemCard key={`mmt-${item.regionKey}-${item.itemId}`} item={item} mmtData={mmtData} setMmt={setMmt} selectionData={selectionData} onSelectItem={onSelectItem} />
            ))}
          </>
        )}
        {reviewSpecial.length > 0 && (
          <>
            <div className="subheading">🔬 Special Tests</div>
            {reviewSpecial.map((item) => (
              <SpecialTestItemCard key={`st-${item.regionKey}-${item.itemId}`} item={item} specialData={specialData} setSpecial={setSpecial} selectedRegions={selectedRegions} isSideless={isSideless(item.regionKey)} selectionData={selectionData} onSelectItem={onSelectItem} />
            ))}
          </>
        )}
        {activeOtherSuggestions.map((s) => {
          const meta = libraryById[s.id];
          if (!meta) return null;
          return <ObjectiveCard key={s.id} id={s.id} label={`${meta.icon} ${meta.label}`} reason={s.reason} suggested active onToggle={() => onToggle(s.id)} onJump={() => onJump?.(s.id)} />;
        })}
        {manuallyAdded.map((id) => {
          const meta = libraryById[id];
          return <ObjectiveCard key={id} id={id} label={`${meta.icon} ${meta.label}`} suggested={false} active onToggle={() => onToggle(id)} onJump={() => onJump?.(id)} />;
        })}

        {traySelectionCount === 0 && <Hint>Nothing selected yet — go back and tap "+ Select" on a suggested test.</Hint>}

        <button type="button" className="obj-review-done" onClick={() => setReviewMode(false)}>
          Done — back to summary
        </button>
      </div>
    );
  }

  return (
    <div className="obj-no-zoom">
      <SectionIntro icon="🧠" title="Objective Assessment" info="Individual items below come from the region(s) you picked; the categories at the bottom come from what you documented in Subjective and Pain — none of this is a live AI/diagnosis call." />

      {topConditions.length > 0 && (
        <>
          <div className="subheading" style={{ marginTop: 0 }}>🧠 Possible matches — Lumbar/SI</div>
          {lumbarResult.redFlagOverride?.triggered && (
            <div style={{ background: "#fee2e2", border: "1.5px solid #dc2626", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: "#991b1b" }}>⚠ {lumbarResult.redFlagOverride.urgency.replace(/_/g, " ")}</div>
              <div style={{ fontSize: 12.5, color: "#991b1b", marginTop: 2 }}>{lumbarResult.redFlagOverride.reason}</div>
              <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 4 }}>{lumbarResult.redFlagOverride.action}</div>
            </div>
          )}
          <ConditionMatchRow conditions={topConditions} activeId={activeConditionIdOrDefault} onSelect={setActiveConditionId} />
          <ConditionDetailPanel condition={activeConditionObj} />
        </>
      )}

      {findingsBlock}

      {conditionFilter && (rom.length || mmt.length || specialTests.length || observation.length) ? (
        <Hint>Narrowed to what {activeConditionObj.name} actually calls for — switch the match above, or use search below, for anything else.</Hint>
      ) : null}

      {visibleObservation.length > 0 && (
        <>
          <div className="subheading" style={{ marginTop: 0 }}>
            👁️ Observation
          </div>
          {visibleObservation.map((item) => (
            <ObservationItemCard key={`obs-${item.regionKey}-${item.itemId}`} item={item} obsData={obsData} setPostureRegion={setPostureRegion} selectionData={selectionData} onSelectItem={onSelectItem} />
          ))}
        </>
      )}

      {visibleRom.length > 0 && (
        <>
          <div className="subheading">📐 Range of Motion</div>
          {visibleRom.map((item) => (
            <RomItemCard key={`rom-${item.regionKey}-${item.itemId}`} item={item} romData={romData} setRom={setRom} selectionData={selectionData} onSelectItem={onSelectItem} />
          ))}
        </>
      )}

      {visibleMmt.length > 0 && (
        <>
          <div className="subheading">💪 Muscle Strength (MMT)</div>
          {visibleMmt.map((item) => (
            <MmtItemCard key={`mmt-${item.regionKey}-${item.itemId}`} item={item} mmtData={mmtData} setMmt={setMmt} selectionData={selectionData} onSelectItem={onSelectItem} />
          ))}
        </>
      )}

      {visibleSpecial.length > 0 && (
        <>
          <div className="subheading">🔬 Special Tests</div>
          {visibleSpecial.map((item) => (
            <SpecialTestItemCard key={`st-${item.regionKey}-${item.itemId}`} item={item} specialData={specialData} setSpecial={setSpecial} selectedRegions={selectedRegions} isSideless={isSideless(item.regionKey)} selectionData={selectionData} onSelectItem={onSelectItem} />
          ))}
        </>
      )}

      <div className="subheading">🖐️ Palpation</div>
      <PalpationInlineCard palpationData={palpationData} setPalpation={setPalpation} />

      {showCpa && cpaItems.length > 0 && (
        <>
          <div className="subheading">🧠 CPA — Compensation Pattern Analysis</div>
          {cpaReason && <Hint>{cpaReason}</Hint>}
          {cpaItems.map((item) => (
            <CpaItemCard key={`cpa-${item.regionKey}-${item.itemId}`} item={item} cpaData={cpaData} setCpa={setCpa} />
          ))}
        </>
      )}

      {showOutcomeMeasure && outcomeMeasureIds.length > 0 && (
        <>
          <div className="subheading">📊 Outcome Measure</div>
          {outcomeMeasureIds.map((id) => {
            const measure = MEASURES[id];
            if (!measure) return null;
            return <OutcomeMeasureInlineCard key={id} measure={measure} reason={omReasonById[id]} instance={omInstances[id]} onSave={saveOutcomeEntry} />;
          })}
        </>
      )}

      {(otherSuggestions.length > 0 || manuallyAdded.length > 0) && <div className="subheading">Other suggested assessments</div>}
      {otherSuggestions.map((s) => {
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

      {traySelectionCount > 0 && (
        <div className="obj-tray">
          <div className="obj-tray-info">
            <div className="obj-tray-count">{traySelectionCount} selected</div>
            <div className="obj-tray-chips">
              {trayLabels.slice(0, 4).map((label, i) => <span className="obj-tray-chip" key={i}>{label}</span>)}
              {trayLabels.length > 4 && <span className="obj-tray-chip">+{trayLabels.length - 4}</span>}
            </div>
          </div>
          <button type="button" className="obj-tray-cta" onClick={() => setReviewMode(true)}>
            View Assessment
          </button>
        </div>
      )}
    </div>
  );
}

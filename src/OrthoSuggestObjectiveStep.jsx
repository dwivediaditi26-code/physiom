import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { SectionIntro, Hint, useSectionData } from "./orthoFieldKit.jsx";
import { suggestObjectiveTests } from "./orthoObjectiveSuggestions.js";
import { OBJECTIVE_CONTENT } from "./orthoObjectiveContent.js";
import { suggestIndividualItems, defaultSideFor, romWhy, romHow, mmtWhy, mmtHow, specialWhy, specialHow, obsWhy, obsHow } from "./orthoIndividualSuggestions.js";
import { ALL_REGIONS } from "./orthoRegionLibrary.js";
import { MMT_GRADE_OPTIONS } from "./orthoClinicalData.js";

/* ============================================================
   OrthoSuggestObjectiveStep — Objective Assessment as a list of
   fillable items, not a picker for whole categories. For the four
   categories with a real named-item library (Observation/ROM/MMT/
   Special Tests), each individual item (e.g. "Lachman's Test",
   "Quadriceps", "Knee flexion", "Scapula") gets its own card with
   Why?/How? and its real inline answer control -- writing straight
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

function LineSheet({ open, onClose, eyebrow, label, lines }) {
  const isEmpty = Array.isArray(lines) ? lines.length === 0 : !lines;
  return (
    <Sheet open={open} onClose={onClose} eyebrow={eyebrow} title={label}>
      {isEmpty ? (
        <Hint>No additional reference notes for this one yet.</Hint>
      ) : Array.isArray(lines) ? (
        <ul className="obj-what-list">
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      ) : (
        <p className="obj-why-text">{lines}</p>
      )}
    </Sheet>
  );
}

/* ---------- Whole-category cards (edema, neuroScreen, kineticChain, ...) ---------- */

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

/* ---------- Individual-item cards (ROM / MMT / Special Tests / Observation) ---------- */

// Collapsed by default -- a single compact row (name + optional value
// summary + Why?/How?) -- expanding only the actual input widget
// (`children`) on tap. Previously every named item (every ROM movement,
// every MMT muscle, every special test) rendered its FULL input widget
// inline and always expanded, which is what made a single Suggested
// Objective step run 6000+px of scroll for one region. Why?/How? stay
// visible in the collapsed row so a clinician can still learn about a
// test without opening it to fill it in.
function ItemCardShell({ label, sublabel, answered, summary, whyLines, howLines, howEyebrow = "HOW TO PERFORM", children }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(null);
  return (
    <div className={"obj-item" + (answered ? " obj-item-answered" : "")}>
      <div className="obj-item-row" onClick={() => setOpen((o) => !o)} role="button">
        <div className="obj-item-row-label">
          <span className="obj-item-row-name">{label}</span>
          {sublabel && <span className="obj-item-row-sub">{sublabel}</span>}
        </div>
        <div className="obj-item-row-right">
          {answered && summary && <span className="obj-item-row-summary">{summary}</span>}
          <button type="button" className="obj-card-link" onClick={(e) => { e.stopPropagation(); setSheet("why"); }}>
            Why?
          </button>
          <button type="button" className="obj-card-link" onClick={(e) => { e.stopPropagation(); setSheet("how"); }}>
            How?
          </button>
          <span className={"obj-item-chevron" + (open ? " open" : "")}>⌄</span>
        </div>
      </div>
      {open && (
        <div className="obj-item-body" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
      <LineSheet open={sheet === "why"} onClose={() => setSheet(null)} eyebrow="WHY THIS ASSESSMENT?" label={label} lines={whyLines} />
      <LineSheet open={sheet === "how"} onClose={() => setSheet(null)} eyebrow={howEyebrow} label={label} lines={howLines} />
    </div>
  );
}

function RomItemCard({ item, romData, setRom }) {
  const { regionKey, itemId, label, meta } = item;
  const entry = romData[regionKey] || {};
  const val = entry[itemId] || {};
  function setSide(side, v) {
    setRom(regionKey, { ...entry, [itemId]: { ...val, [side]: v } });
  }
  const answered = val.left || val.right;
  const norm = meta.normal != null ? `N=${meta.normal}${meta.unit || "°"}` : null;
  const unit = meta.unit || "°";
  const summary = [val.left && `L ${val.left}${unit}`, val.right && `R ${val.right}${unit}`].filter(Boolean).join(" / ");
  return (
    <ItemCardShell label={label} sublabel={[meta.plane, norm].filter(Boolean).join(" · ")} answered={!!answered} summary={summary} whyLines={romWhy(meta)} howLines={romHow(meta)}>
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

function MmtItemCard({ item, mmtData, setMmt }) {
  const { regionKey, itemId, label, meta } = item;
  const entry = mmtData[regionKey] || {};
  const val = entry[itemId] || {};
  function setSide(side, v) {
    setMmt(regionKey, { ...entry, [itemId]: { ...val, [side]: v } });
  }
  const answered = val.left || val.right;
  const summary = [val.left && `L ${val.left}`, val.right && `R ${val.right}`].filter(Boolean).join(" / ");
  return (
    <ItemCardShell label={label} sublabel={[meta.nerve, meta.root].filter(Boolean).join(" · ")} answered={!!answered} summary={summary} whyLines={mmtWhy(meta)} howLines={mmtHow(meta)}>
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

function SpecialTestItemCard({ item, specialData, setSpecial, selectedRegions, isSideless }) {
  const { regionKey, itemId, label, meta } = item;
  const entry = specialData[regionKey] || {};
  const raw = entry[itemId];
  const currentSide = isSideless ? null : entry[itemId + "__side"] || defaultSideFor(regionKey, selectedRegions);
  const currentValue = isSideless ? raw : raw && typeof raw === "object" ? raw[currentSide] : undefined;
  function setResult(optionValue) {
    if (isSideless) {
      setSpecial(regionKey, { ...entry, [itemId]: optionValue });
      return;
    }
    const obj = raw && typeof raw === "object" ? raw : {};
    setSpecial(regionKey, { ...entry, [itemId]: { ...obj, [currentSide]: optionValue } });
  }
  function setSideChip(s) {
    setSpecial(regionKey, { ...entry, [itemId + "__side"]: s });
  }
  const options = meta.options || ["Negative", "Positive"];
  const answered = isSideless ? !!raw : !!(raw && typeof raw === "object" && raw[currentSide]);
  const summary = answered ? [currentSide && !isSideless ? currentSide[0].toUpperCase() + currentSide.slice(1) : null, currentValue].filter(Boolean).join(" — ") : "";
  return (
    <ItemCardShell label={label} sublabel={meta.structure} answered={answered} summary={summary} whyLines={specialWhy(meta)} howLines={specialHow(meta)}>
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

function ObservationItemCard({ item, obsData, setPostureRegion }) {
  const { regionKey, itemId, label, meta } = item;
  const view = meta.view;
  const regions = obsData.posture?.regions || {};
  const viewData = regions[regionKey]?.[view] || {};
  const value = viewData[itemId];
  function pick(o) {
    setPostureRegion(regionKey, view, itemId, value === o ? "" : o);
  }
  return (
    <ItemCardShell label={label} answered={!!value} summary={value || ""} whyLines={obsWhy(meta)} howLines={obsHow()}>
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

export default function OrthoSuggestObjectiveStep({ data, setData, selectedRegions, condition, activeIds, onToggle, library, onJump }) {
  const [q, setQ] = useState("");

  const [romData, setRomD] = useSectionData(data, setData, "rom");
  const [mmtData, setMmtD] = useSectionData(data, setData, "mmt");
  const [specialData, setSpecialD] = useSectionData(data, setData, "specialTests");
  const [obsData, setObsD] = useSectionData(data, setData, "observation");
  const setRom = (k, v) => setRomD(k, v);
  const setMmt = (k, v) => setMmtD(k, v);
  const setSpecial = (k, v) => {
    setSpecialD(k, v);
    if (!activeIds.has("specialTests")) onToggle("specialTests");
  };
  const setPostureRegion = (regionKey, view, fieldId, value) => {
    const posture = obsData.posture || {};
    const regions = posture.regions || {};
    const regionData = regions[regionKey] || {};
    const viewData = regionData[view] || {};
    setObsD("posture", { ...posture, regions: { ...regions, [regionKey]: { ...regionData, [view]: { ...viewData, [fieldId]: value } } } });
  };

  const { rom, mmt, specialTests, observation } = useMemo(() => suggestIndividualItems(selectedRegions), [selectedRegions]);

  const suggestions = useMemo(
    () => suggestObjectiveTests({ subjective: data.subjective || {}, pain: data.pain || {}, condition, selectedRegions }).filter((s) => !["rom", "mmt", "specialTests"].includes(s.id)),
    [data.subjective, data.pain, condition, selectedRegions]
  );
  const suggestedIds = new Set(suggestions.map((s) => s.id));
  const libraryById = Object.fromEntries(library.map((it) => [it.id, it]));
  const manuallyAdded = [...activeIds].filter((id) => !suggestedIds.has(id) && libraryById[id]);

  const query = q.trim().toLowerCase();
  const searchResults = query ? library.filter((it) => !suggestedIds.has(it.id) && !activeIds.has(it.id) && it.label.toLowerCase().includes(query)) : [];

  const isSideless = (regionKey) => !!ALL_REGIONS.find((r) => r.id === regionKey)?.sideless;

  return (
    <>
      <SectionIntro icon="🧠" title="Objective Assessment" info="Individual items below come from the region(s) you picked; the categories at the bottom come from what you documented in Subjective and Pain — none of this is a live AI/diagnosis call." />

      {observation.length > 0 && (
        <>
          <div className="subheading" style={{ marginTop: 0 }}>
            👁️ Observation
          </div>
          {observation.map((item) => (
            <ObservationItemCard key={`obs-${item.regionKey}-${item.itemId}`} item={item} obsData={obsData} setPostureRegion={setPostureRegion} />
          ))}
        </>
      )}

      {rom.length > 0 && (
        <>
          <div className="subheading">📐 Range of Motion</div>
          {rom.map((item) => (
            <RomItemCard key={`rom-${item.regionKey}-${item.itemId}`} item={item} romData={romData} setRom={setRom} />
          ))}
        </>
      )}

      {mmt.length > 0 && (
        <>
          <div className="subheading">💪 Muscle Strength (MMT)</div>
          {mmt.map((item) => (
            <MmtItemCard key={`mmt-${item.regionKey}-${item.itemId}`} item={item} mmtData={mmtData} setMmt={setMmt} />
          ))}
        </>
      )}

      {specialTests.length > 0 && (
        <>
          <div className="subheading">🔬 Special Tests</div>
          {specialTests.map((item) => (
            <SpecialTestItemCard key={`st-${item.regionKey}-${item.itemId}`} item={item} specialData={specialData} setSpecial={setSpecial} selectedRegions={selectedRegions} isSideless={isSideless(item.regionKey)} />
          ))}
        </>
      )}

      {(suggestions.length > 0 || manuallyAdded.length > 0) && <div className="subheading">Other suggested assessments</div>}
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

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

/* ============================================================
   BRAND / TOKENS — shared by every Ortho assessment module
   (IPD, Post-operative Rehab, ...) so they stay visually
   identical and in sync as the design evolves.
   ============================================================ */
export const BRAND = {
  purple: "#7C3AED",
  purpleDark: "#6D28D9",
  purpleFaint: "#F3F0FF",
  border: "#ECE9F7",
  ink: "#1A1A2E",
  gray: "#6B6B7A",
  grayLight: "#9C9CAE",
  green: "#16A34A",
  greenBg: "#EDFBF3",
  amber: "#D97706",
  amberBg: "#FEF6E7",
  red: "#DC2626",
  redBg: "#FDEDED",
  white: "#FFFFFF",
};

/* ============================================================
   GENERIC FIELD COMPONENTS — tap-to-select, minimal typing
   ============================================================ */
export function Hint({ children }) {
  if (!children) return null;
  return <div className="hint">💡 {children}</div>;
}

// Same real Cloudinary asset pattern used by PhysioNeuro.jsx's
// ClinicalImage/ClinicalImageCard and the PhysioFeed Study Mode
// StudyImage.jsx (f_auto,q_auto, no crop) -- duplicated here rather than
// cross-imported since neither of those live in a shared, exported
// location; same convention StudyImage.jsx itself already uses.
const CLOUDINARY_BASE = "https://res.cloudinary.com/dr15y1pwj/image/upload";

function SheetHero({ name }) {
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  if (!name || failed) return <div className="sheet-hero"><span className="sheet-hero-fallback">No reference photo</span></div>;
  const src = `${CLOUDINARY_BASE}/f_auto,q_auto/${name}`;
  return (
    <>
      <div className="sheet-hero" onClick={() => setZoomed(true)} role="button" aria-label="Enlarge photo">
        <img src={src} alt="" onError={() => setFailed(true)} />
        <span className="sheet-hero-zoom">⤢</span>
      </div>
      {zoomed && (
        <div className="lightbox-backdrop" onClick={() => setZoomed(false)}>
          <img src={src} alt="" className="lightbox-img" />
          <button type="button" className="lightbox-close" onClick={() => setZoomed(false)} aria-label="Close">✕</button>
        </div>
      )}
    </>
  );
}

/* Perform / Reference / Interpret -- same 3-tab split Cardio/Neuro's own
   "Learn" panel uses, so a ROM/MMT/Special Test item's rich content fits
   one screen per tab instead of one long scroll. Tabs with no content for
   this item are skipped entirely (e.g. a test with no Reference stats). */
function SheetTabs({ tabs, active, onSelect }) {
  if (tabs.length <= 1) return null;
  return (
    <div className="sheet-tabs">
      {tabs.map((t, i) => (
        <button key={t.key} type="button" className={"sheet-tab" + (active === t.key ? " sheet-tab-active" : "")} onClick={() => onSelect(t.key)}>
          <span className="sheet-tab-num">{i + 1}</span> {t.label}
        </button>
      ))}
    </div>
  );
}

/* Rich-content building blocks for "How to perform" sheets -- same labeled,
   tinted-card visual language as PhysioFeed's Study Mode (InfoBox.jsx),
   reimplemented with Ortho's own plain-CSS system (orthoStyles.js) instead
   of importing across the Tailwind boundary (Tailwind is scoped to
   src/physiofeed/** only -- see tailwind.config.js). Exported so
   orthoRegionAssessments.jsx can build ROM/MMT/Special Test sections that
   mirror RomStudy/MmtStudy/SpecialStudy's toCard() output field-for-field. */
export function InfoCard({ icon, label, tint = "gray", children }) {
  return (
    <div className={`info-card info-card-${tint}`}>
      <div className="info-card-label">{icon && <span aria-hidden="true">{icon}</span>}{label}</div>
      <div className="info-card-body">{children}</div>
    </div>
  );
}

export function InfoCardGrid({ children }) {
  return <div className="info-card-grid">{children}</div>;
}

export function AnatomyGrid({ items }) {
  const rows = items.filter(([, v]) => v);
  if (!rows.length) return null;
  return (
    <div className="info-anatomy-grid">
      {rows.map(([label, val]) => (
        <div key={label} className="info-anatomy-cell">
          <div className="info-anatomy-cell-label">{label}</div>
          <div className="info-anatomy-cell-value">{val}</div>
        </div>
      ))}
    </div>
  );
}

export function ProtocolList({ label = "Testing protocol", items }) {
  const rows = items.filter(([, v]) => v);
  if (!rows.length) return null;
  return (
    <div>
      <div className="info-protocol-label">{label}</div>
      {rows.map(([lbl, val, icon]) => (
        <div key={lbl} className="info-protocol-row">
          {icon && <span aria-hidden="true">{icon}</span>}
          <span><b>{lbl}:</b> {val}</span>
        </div>
      ))}
    </div>
  );
}

const SHEET_TABS = [
  { key: "perform", label: "Perform" },
  { key: "reference", label: "Reference" },
  { key: "interpret", label: "Interpret" },
];

/* "How to perform" is always a separate educational layer from the filling
   UI — tapping ⓘ opens a bottom sheet over a dim backdrop, never inline
   text mixed into the assessment card. Works the same for the small icon
   variant and the full-width "How to perform" button variant.
   richItem (optional) = { image, title, subtitle, perform, reference,
   interpret } -- when given, the sheet renders the real reference photo
   (tap to enlarge) + the item's content split across the same Perform/
   Reference/Interpret tabs Cardio/Neuro's own Learn panel uses, so each
   tab fits on screen instead of one long scroll. Content built via
   InfoCard/AnatomyGrid/ProtocolList above. `text` stays supported for the
   many other field hints in this file that aren't ROM/MMT/Special Test
   items. */
export function InfoButton(props) {
  const { text, title, eyebrow = "HOW TO PERFORM", richItem } = props;
  const [open, setOpen] = useState(false);
  const availableTabs = richItem ? SHEET_TABS.filter((t) => richItem[t.key]) : [];
  const [tab, setTab] = useState(availableTabs[0]?.key);
  const activeTab = availableTabs.find((t) => t.key === tab) ? tab : availableTabs[0]?.key;
  const heading = richItem?.title || title;
  const openSheet = () => { setTab(availableTabs[0]?.key); setOpen(true); };
  return (
    <span className={props.label ? "info-btn-wrap info-btn-wrap-full" : "info-btn-wrap"}>
      <button type="button" className={props.label ? "info-btn-full" : "info-btn"} onClick={openSheet}>
        ⓘ {props.label || ""}
      </button>
      {open && createPortal(
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <span className="sheet-eyebrow">{eyebrow}</span>
              <button type="button" className="sheet-close" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            {heading && <div className="sheet-title">{heading}</div>}
            {richItem?.subtitle && <div className="sheet-subtitle">{richItem.subtitle}</div>}
            {richItem && <SheetTabs tabs={availableTabs} active={activeTab} onSelect={setTab} />}
            <div className="sheet-scroll">
              {richItem ? (
                <>
                  <SheetHero name={richItem.image} />
                  {richItem[activeTab]}
                </>
              ) : (
                <div className="sheet-body">{text}</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </span>
  );
}

export function FieldShell({ label, hint, howTo, children }) {
  return (
    <div className="field-block">
      {label && (
        <div className="field-label-row">
          <span className="field-label">{label}</span>
          {howTo && <InfoButton text={howTo} />}
        </div>
      )}
      {children}
      <Hint>{hint}</Hint>
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder, hint, howTo, unit }) {
  return (
    <FieldShell label={label} hint={hint} howTo={howTo}>
      <div className="text-input-wrap">
        <input className="text-input" value={value || ""} placeholder={placeholder || ""} onChange={(e) => onChange(e.target.value)} />
        {unit && <span className="combo-unit">{unit}</span>}
      </div>
    </FieldShell>
  );
}

function SelectPopover({ options, multi, value, onChange, onClose }) {
  const selected = multi ? (value ? String(value).split(", ").filter(Boolean) : []) : value;
  function toggle(opt) {
    if (multi) {
      const has = selected.includes(opt);
      const next = has ? selected.filter((o) => o !== opt) : [...selected, opt];
      onChange(next.join(", "));
    } else {
      onChange(opt);
      onClose();
    }
  }
  return (
    <div className="select-popover">
      <div className="popover-head">
        <span>{multi ? "Select any" : "Select one"}</span>
        <button type="button" className="popover-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="popover-list">
        {options.map((opt) => {
          const isSel = multi ? selected.includes(opt) : value === opt;
          return (
            <button type="button" key={opt} className={"popover-item" + (isSel ? " popover-item-active" : "")} onClick={() => toggle(opt)}>
              <span>{opt}</span>
              {isSel && <span className="popover-check">✓</span>}
            </button>
          );
        })}
      </div>
      {multi && (
        <button type="button" className="popover-done" onClick={onClose}>
          Done
        </button>
      )}
    </div>
  );
}

export function SelectField({ label, type = "single", options, value, onChange, howTo, placeholder, hint }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <FieldShell label={label} hint={hint} howTo={howTo}>
      <div className="select-wrap" ref={ref}>
        <input
          className="select-input"
          value={value || ""}
          placeholder={placeholder || (type === "multi" ? "Type or select, comma separated..." : "Type or select...")}
          onFocus={() => setOpen(true)}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" className="select-btn" onClick={() => setOpen((o) => !o)}>
          Select ⌄
        </button>
        {open && <SelectPopover options={options} multi={type === "multi"} value={value} onChange={onChange} onClose={() => setOpen(false)} />}
      </div>
    </FieldShell>
  );
}

/* Compact tap-to-open picker — a small pill trigger that opens a short
   popover list, instead of a full row of always-visible chips. Used for
   ROM pain/end-feel and MMT grade, where a wall of chip buttons would eat
   the whole card. */
export function MiniSelect({ label, value, options, onChange, placeholder, tone }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <span className="mini-select-wrap" ref={ref}>
      <button type="button" className={"mini-select-trigger" + (value ? " mini-select-filled" : "") + (tone ? " mini-select-" + tone : "")} onClick={() => setOpen((o) => !o)}>
        {value || placeholder || label}
        <span className="mini-select-caret">⌄</span>
      </button>
      {open && (
        <div className="select-popover mini-select-popover">
          <div className="popover-head">
            <span>{label}</span>
            <button type="button" className="popover-close" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="popover-list">
            {options.map((opt) => {
              const isSel = value === opt;
              return (
                <button
                  type="button"
                  key={opt}
                  className={"popover-item" + (isSel ? " popover-item-active" : "")}
                  onClick={() => {
                    onChange(isSel ? "" : opt);
                    setOpen(false);
                  }}
                >
                  <span>{opt}</span>
                  {isSel && <span className="popover-check">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </span>
  );
}

export function Segmented({ label, options, value, onChange, hint, howTo, wrap }) {
  return (
    <FieldShell label={label} hint={hint} howTo={howTo}>
      <div className={"segmented" + (wrap ? " segmented-wrap" : "")}>
        {options.map((o) => (
          <button type="button" key={o} className={"seg-btn" + (value === o ? " seg-active" : "")} onClick={() => onChange(value === o ? "" : o)}>
            {o}
          </button>
        ))}
      </div>
    </FieldShell>
  );
}

export function NumberField({ label, value, onChange, unit, placeholder, hint, howTo, width }) {
  return (
    <div className="vital-field" style={width ? { flexBasis: width } : undefined}>
      <div className="vital-label-row">
        <span className="vital-label">{label}</span>
        {howTo && <InfoButton text={howTo} />}
      </div>
      <div className="vital-input-wrap">
        <input
          type="number"
          inputMode="decimal"
          className="vital-input"
          value={value || ""}
          placeholder={placeholder || "—"}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit && <span className="vital-unit">{unit}</span>}
      </div>
      <Hint>{hint}</Hint>
    </div>
  );
}

export function TextArea({ label, value, onChange, placeholder, hint, howTo }) {
  return (
    <FieldShell label={label} hint={hint} howTo={howTo}>
      <textarea className="textarea" rows={2} value={value || ""} placeholder={placeholder || "Type here..."} onChange={(e) => onChange(e.target.value)} />
    </FieldShell>
  );
}

export function ScaleField({ label, value, onChange, hint, howTo, max = 10 }) {
  const v = value === undefined || value === "" ? 0 : Number(value);
  return (
    <FieldShell label={label} hint={hint} howTo={howTo}>
      <div className="scale-wrap">
        <input type="range" min={0} max={max} step={1} value={v} style={{ minWidth: 0 }} onChange={(e) => onChange(e.target.value)} className="scale-range" />
        <span className="scale-readout">
          {value === undefined || value === "" ? "—" : v}
          <span className="scale-max">/{max}</span>
        </span>
      </div>
    </FieldShell>
  );
}

export function YesNo({ label, value, onChange, hint, howTo }) {
  return (
    <FieldShell label={label} hint={hint} howTo={howTo}>
      <div className="segmented" style={{ maxWidth: 220 }}>
        {["Yes", "No"].map((o) => (
          <button type="button" key={o} className={"seg-btn" + (value === o ? " seg-active" : "")} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </FieldShell>
  );
}

/* 0-5 MMT grade chip row, selected value highlighted */
export function GradeField({ label, value, onChange, howTo }) {
  return (
    <div className="grade-row">
      <div className="grade-row-label">
        <span>{label}</span>
        {howTo && <InfoButton text={howTo} />}
      </div>
      <div className="grade-chips">
        {["0", "1", "2", "3", "4", "5"].map((g) => (
          <button type="button" key={g} className={"grade-chip" + (value === g ? " grade-chip-active" : "")} onClick={() => onChange(value === g ? "" : g)}>
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Compact L/R numeric stepper — value + up/down mini-buttons. Colour
   communicates clinical meaning, never decoration: pass `colorize` for the
   built-in MMT scale (0–3 red, 4 amber, 5 green), or pass an explicit
   `tone` ("normal" | "mild" | "severe") when the caller has its own
   comparison logic (e.g. ROM value vs textbook norm). */
export function Stepper({ value, onChange, min = 0, max = 99, step = 1, colorize, tone: toneProp }) {
  const num = value === undefined || value === "" ? null : Number(value);
  function bump(delta) {
    const base = num === null ? (min > 0 ? min : 0) : num;
    const next = Math.min(max, Math.max(min, base + delta));
    onChange(String(next));
  }
  let tone = "";
  if (toneProp) tone = toneProp ? " stepper-" + toneProp : "";
  else if (colorize && num !== null) tone = num >= 5 ? " stepper-normal" : num === 4 ? " stepper-mild" : " stepper-severe";
  return (
    <div className={"stepper" + tone}>
      <input
        className="stepper-input"
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        placeholder="--"
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="stepper-arrows">
        <button type="button" className="stepper-arrow" onClick={() => bump(step)} aria-label="Increase">
          ▲
        </button>
        <button type="button" className="stepper-arrow" onClick={() => bump(-step)} aria-label="Decrease">
          ▼
        </button>
      </div>
    </div>
  );
}

/* 6-level assistance selector used for bed mobility / transfers */
const ASSIST_LEVELS = ["Independent", "Supervision", "Min Assist", "Mod Assist", "Max Assist", "Dependent"];
export function AssistField({ label, value, onChange, howTo }) {
  return (
    <FieldShell label={label} howTo={howTo}>
      <div className="segmented segmented-wrap">
        {ASSIST_LEVELS.map((o) => (
          <button type="button" key={o} className={"seg-btn" + (value === o ? " seg-active" : "")} onClick={() => onChange(value === o ? "" : o)}>
            {o}
          </button>
        ))}
      </div>
    </FieldShell>
  );
}

export function Alert({ tone = "amber", children }) {
  return <div className={"alert alert-" + tone}>{children}</div>;
}

export function SectionIntro({ icon, title, sub, info }) {
  return (
    <div className="section-intro">
      <div className="section-intro-icon">{icon}</div>
      <div style={{ flex: 1 }}>
        <div className="section-intro-title-row">
          <div className="section-intro-title">{title}</div>
          {info && <InfoButton text={info} />}
        </div>
        {sub && <div className="section-intro-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* Top step nav — small circles per step, tap to jump anywhere */
export function StepNav({ steps, currentIndex, visited, onJump, onAddClick }) {
  const refs = useRef([]);
  useEffect(() => {
    const el = refs.current[currentIndex];
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [currentIndex]);
  return (
    <div className="step-nav">
      {steps.map((s, i) => {
        const active = i === currentIndex;
        const seen = visited.has(s.id) && !active;
        return (
          <button
            key={s.id}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            className={"step-circle" + (active ? " step-active" : seen ? " step-seen" : "")}
            onClick={() => onJump(i)}
            aria-label={s.label}
            title={s.label}
          >
            {s.icon}
          </button>
        );
      })}
      <button type="button" className="step-circle step-add" onClick={onAddClick} aria-label="Add assessment" title="Add assessment">
        +
      </button>
    </div>
  );
}

export function useSectionData(data, setData, key) {
  const section = data[key] || {};
  const set = (field, value) => setData((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  return [section, set];
}

export function AddMovementRow({ onAdd, placeholder }) {
  const [val, setVal] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="add-row-btn" onClick={() => setOpen(true)}>
        {placeholder}
      </button>
    );
  }
  return (
    <div className="add-row-input">
      <input className="text-input" autoFocus value={val} placeholder="Name..." onChange={(e) => setVal(e.target.value)} />
      <button
        type="button"
        className="add-row-confirm"
        onClick={() => {
          if (val.trim()) onAdd(val.trim());
          setVal("");
          setOpen(false);
        }}
      >
        Add
      </button>
    </div>
  );
}

export function fmtVal(v) {
  if (Array.isArray(v)) return v.length ? v.join(", ") : null;
  if (v && typeof v === "object") {
    const entries = Object.entries(v).filter(([, val]) => val && !(Array.isArray(val) && !val.length));
    return entries.length ? entries.map(([k, val]) => `${k.replace(/__/g, " ")}: ${Array.isArray(val) ? val.join(", ") : val}`).join(" · ") : null;
  }
  if (v === undefined || v === null || v === "") return null;
  return String(v);
}

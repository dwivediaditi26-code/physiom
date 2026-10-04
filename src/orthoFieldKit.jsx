import React, { useState, useRef, useEffect, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { FieldLabel, SectionTitle } from "./assessmentTypography.jsx";
import { uploadImage, uploadErrorMessage } from "./services/cloudinary.js";

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

   One field kit for every assessment: Ortho (IPD / Outpatient /
   Post-op), Neuro and Cardio. Ortho uses the defaults. Neuro and
   Cardio used to carry their own copies of these components; they
   now wrap their wizard in <FieldKitContext.Provider value={...}> to
   keep the few things that look or behave differently there:

     renderInfo(info)  rich info-card button for a field's `info` prop
                       (Neuro/Cardio's Perform / Scale / Interpret card)
     renderHowTo(text) the "How to" button for a field's `howTo` text
     classicLayout     plain section title and step-bar circles
                       (no title row / icon wrapper)
     compactSelect     "▾" list button instead of "Select ⌄"
     searchSelects     search box in long option lists (> 6 options)
     scaleStep         slider step for ScaleField (default 1)
     addStepLabel      tooltip of the step bar's "+" button
   ============================================================ */
export const FieldKitContext = createContext({});
const useKit = () => useContext(FieldKitContext) || {};

// The help button next to a field label: a rich info card when the module
// supplies one, otherwise the plain "how to" text.
function FieldHelp({ info, howTo }) {
  const kit = useKit();
  if (info && kit.renderInfo) return kit.renderInfo(info);
  if (!howTo) return null;
  return kit.renderHowTo ? kit.renderHowTo(howTo) : <InfoButton text={howTo} />;
}

export function Hint({ children }) {
  if (!children) return null;
  return <div className="hint">💡 {children}</div>;
}

// Same real Cloudinary asset pattern used by the old PhysioNeuro.jsx's
// ClinicalImage/ClinicalImageCard and the PhysioFeed Study Mode
// StudyImage.jsx (f_auto,q_auto, no crop) -- duplicated here rather than
// cross-imported since neither of those live in a shared, exported
// location; same convention StudyImage.jsx itself already uses.
export const CLOUDINARY_BASE = "https://res.cloudinary.com/dr15y1pwj/image/upload";

// `name` is always a deterministic Cloudinary public_id (ROM_DATA/MMT_DATA/
// SPECIAL_TESTS_DATA/neuroExamLibraryData assign one to every movement,
// muscle, test and nerve-root level up front -- id known before any photo
// is actually uploaded there, same "id known up front" scheme
// ConditionObjectiveAssessment.jsx's own patient-photo tiles and Cardio/
// Neuro's InfoCard.jsx use). `failed` just means nothing has been uploaded
// to that slot YET, not that it can't be -- so upload-in-place here builds
// out Ortho's own reference-photo library the same way InfoCard.jsx does
// for Cardio/Neuro (2026-09-17, Aditi, pointing at Neuro's camera badge:
// "we can upload image from here and replace... i think we should do in
// ortho also in rom mmt and neuro and special test").
function SheetHero({ name }) {
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [version, setVersion] = useState(0);
  const fileInputRef = useRef(null);
  if (!name) return <div className="sheet-hero"><span className="sheet-hero-fallback">No reference photo</span></div>;
  const src = `${CLOUDINARY_BASE}/f_auto,q_auto/${name}${version ? `?v=${version}` : ""}`;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await uploadImage(file, name);
      setFailed(false);
      setVersion(Date.now());
    } catch (err) {
      alert(uploadErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      {failed ? (
        <div className="sheet-hero sheet-hero-empty" onClick={() => fileInputRef.current?.click()} role="button" aria-label="Add a reference photo">
          <span className="sheet-hero-fallback">{uploading ? "Uploading…" : "📷 Tap to add a reference photo"}</span>
        </div>
      ) : (
        <div className="sheet-hero" onClick={() => setZoomed(true)} role="button" aria-label="Enlarge photo">
          <img src={src} alt="" onError={() => setFailed(true)} />
          <span className="sheet-hero-zoom">⤢</span>
          <button type="button" className="sheet-hero-replace" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} title="Replace photo" aria-label="Replace photo" disabled={uploading}>
            {uploading ? "…" : "📷"}
          </button>
        </div>
      )}
      {zoomed && (
        <div className="lightbox-backdrop" onClick={() => setZoomed(false)}>
          <img src={src} alt="" className="lightbox-img" />
          <button type="button" className="lightbox-replace" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} disabled={uploading}>
            📷 {uploading ? "Uploading…" : "Replace photo"}
          </button>
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
// imageTrigger: square photo-thumbnail trigger instead of the ⓘ pill --
// same underlying sheet/tabs, just a different way in (2026-09-11, Aditi:
// "put the images of ROM and special test... miniature format... click
// opens the info card that's already present"). Reuses the exact same
// Cloudinary asset (richItem.image, keyed by the ROM/Special Test data's
// own id) SheetHero already shows inside the opened sheet -- no separate
// image source, so the thumbnail and the sheet's hero photo can never
// drift apart. Falls back to a plain icon tile (fallbackIcon) when there's
// no richItem.image or the photo 404s, same as SheetHero's own fallback.
export function InfoButton(props) {
  const { text, title, eyebrow = "HOW TO PERFORM", richItem, small, size, imageTrigger, fallbackIcon } = props;
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const availableTabs = richItem ? SHEET_TABS.filter((t) => richItem[t.key]) : [];
  const [tab, setTab] = useState(availableTabs[0]?.key);
  const activeTab = availableTabs.find((t) => t.key === tab) ? tab : availableTabs[0]?.key;
  const heading = richItem?.title || title;
  const openSheet = () => { setTab(availableTabs[0]?.key); setOpen(true); };
  const imgSrc = richItem?.image ? `${CLOUDINARY_BASE}/f_auto,q_auto,w_200,h_200,c_fill/${richItem.image}` : null;
  const sizeClass = size === "lg" ? " info-img-trigger-lg" : size === "md" ? " info-img-trigger-md" : small ? " info-img-trigger-sm" : "";
  return (
    <span className={props.label ? "info-btn-wrap info-btn-wrap-full" : "info-btn-wrap"}>
      {imageTrigger ? (
        <button type="button" className={"info-img-trigger" + sizeClass} onClick={openSheet} aria-label={heading ? `View ${heading}` : "View details"}>
          {imgSrc && !imgFailed ? (
            <img src={imgSrc} alt="" onError={() => setImgFailed(true)} />
          ) : (
            <i className={"ti " + (fallbackIcon || "ti-photo")} aria-hidden="true"></i>
          )}
        </button>
      ) : (
        <button type="button" className={props.label ? "info-btn-full" : small ? "info-btn-sm" : "info-btn"} onClick={openSheet}>
          ⓘ {props.label || ""}
        </button>
      )}
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
                  {!(richItem.hideHeroOn || []).includes(activeTab) && <SheetHero name={richItem.image} />}
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

// Blocks the explicit "Save Assessment" tap (not the silent 2s auto-save --
// that keeps running regardless, so in-progress work still survives a
// crash/tab-close) when Patient Name and/or Age are still blank. Without a
// name, AppFull.jsx's "create a patient row once dem_name appears" effect
// never fires, so the whole assessment silently has nowhere to be filed
// under -- this stops that at the one moment the therapist actually
// intends to finish, rather than nagging on every keystroke.
export function MissingDemographicsModal({ missing, onGoToDemographics, onClose }) {
  const label = missing.length > 1 ? "name and age" : missing[0];
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="missing-dem-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="missing-dem-icon">📋</div>
        <div className="missing-dem-title">Patient {label} needed</div>
        <div className="missing-dem-body">The assessment is filed under the patient's name — fill in the {label} before saving, or it won't be linked to a patient record.</div>
        <button type="button" className="primary-btn" style={{ width: "100%" }} onClick={onGoToDemographics}>
          Go to Patient Info
        </button>
        <button type="button" className="ghost-btn" style={{ width: "100%", marginTop: 8 }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

// True if patient name/age are missing from the given demographics-shaped
// object (accepts either {name,age,...} (IPD/Post-op's caseInfo) or the
// same shape under a different section key (Outpatient's demographics) --
// callers just pass whichever section object they already have).
export function missingDemographicsFields(dem) {
  const missing = [];
  if (!String(dem?.name || "").trim()) missing.push("name");
  if (!String(dem?.age || "").trim()) missing.push("age");
  return missing;
}

export function FieldShell({ label, hint, howTo, info, children }) {
  return (
    <div className="field-block">
      {label && (
        <div className="field-label-row">
          <FieldLabel>{label}</FieldLabel>
          <FieldHelp info={info} howTo={howTo} />
        </div>
      )}
      {children}
      <Hint>{hint}</Hint>
    </div>
  );
}

// Left/Right (or single-column) grading grid -- same shape as Neuro's own
// LRGrid (myotomes, dermatomes, DTRs, sensory, coordination), ported here so
// Ortho's neuro screen doesn't have to cross-import a component styled for
// a different module's CSS. rows="Bicep (C5-6)" etc, one <select> per row x
// column, value keyed "row__column".
// rowInfo (optional): { [rowLabel]: richItem } -- same idea as Neuro's own
// LRGrid's rowInfo/InfoCardButton (each row is really its own distinct
// test, e.g. a DTR or dermatome, not one shared technique), rendered via
// Ortho's own InfoButton imageTrigger + richItem sheet -- the same real
// reference-photo info card ROM/MMT movements already show, not a second,
// separately-authored info system (2026-09-17, Aditi: after a plain-text
// ⓘ pass, "in neuro clinical assessment this have in sensory and reflex
// examination take reference of image and info card from there and put it
// images like rom").
export function LRGrid({ label, rows, columns = ["Right", "Left"], options, value = {}, onChange, hint, howTo, info, rowInfo }) {
  const kit = useKit();
  return (
    <FieldShell label={label} hint={hint} howTo={howTo} info={info}>
      <div className="lr-grid">
        <div className="lr-row lr-head">
          <div className="lr-cell lr-zone" />
          {columns.map((c) => (
            <div className="lr-cell lr-colhead" key={c}>{c}</div>
          ))}
        </div>
        {rows.map((r) => (
          <div className="lr-row" key={r}>
            {kit.renderInfo ? (
              // Neuro/Cardio: the row's own info card after the row name.
              <div className="lr-cell lr-zone" style={rowInfo?.[r] ? { display: "flex", alignItems: "center", gap: 4 } : undefined}>
                {r}
                {rowInfo?.[r] && kit.renderInfo(rowInfo[r])}
              </div>
            ) : (
              <div className="lr-cell lr-zone" style={rowInfo?.[r] ? { gap: 6 } : undefined}>
                {rowInfo?.[r] && <InfoButton imageTrigger small fallbackIcon="ti-photo" title={r} richItem={rowInfo[r]} />}
                <span>{r}</span>
              </div>
            )}
            {columns.map((c) => {
              const key = `${r}__${c}`;
              return (
                <div className="lr-cell" key={c}>
                  <select className="lr-select" value={value[key] || ""} onChange={(e) => onChange({ ...value, [key]: e.target.value })}>
                    <option value="">–</option>
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </FieldShell>
  );
}

export function TextField({ label, value, onChange, placeholder, hint, howTo, info, unit }) {
  return (
    <FieldShell label={label} hint={hint} howTo={howTo} info={info}>
      <div className="text-input-wrap">
        <input className="text-input" value={value || ""} placeholder={placeholder || ""} onChange={(e) => onChange(e.target.value)} />
        {unit && <span className="combo-unit">{unit}</span>}
      </div>
    </FieldShell>
  );
}

function SelectPopover({ options, multi, value, onChange, onClose }) {
  const kit = useKit();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const showSearch = kit.searchSelects && options.length > 6;
  const shown = showSearch && query ? options.filter((o) => o.toLowerCase().includes(query)) : options;
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
  // Redesign (2026-08-31, Aditi: "the choosing option is big and takes all
  // the space of screen"): was one full-width lavender pill per option --
  // on a real phone, several of those plus the header/Done button pushed
  // well past the fold. Now a compact checklist (thin divider rows, a
  // small check/radio box instead of a full color-fill flip) with its OWN
  // capped, internally-scrolling list -- header and Done stay pinned and
  // visible no matter how many options a field has.
  return (
    <div className="select-popover">
      <div className="popover-head">
        <span>{multi ? "Select any" : "Select one"}</span>
        <button type="button" className="popover-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      {showSearch && (
        <input className="popover-search" placeholder="🔍 Search" value={q} onChange={(e) => setQ(e.target.value)} />
      )}
      <div className="popover-list">
        {shown.map((opt) => {
          const isSel = multi ? selected.includes(opt) : value === opt;
          return (
            <button type="button" key={opt} className={"popover-item" + (isSel ? " popover-item-active" : "")} onClick={() => toggle(opt)}>
              <span className={"popover-check-icon" + (multi ? "" : " popover-check-icon-radio") + (isSel ? " popover-check-icon-active" : "")}>
                {isSel && "✓"}
              </span>
              <span className="popover-item-label">{opt}</span>
            </button>
          );
        })}
      </div>
      {multi && (
        <button type="button" className="popover-done" onClick={onClose}>
          Done{selected.length > 0 ? ` · ${selected.length} selected` : ""}
        </button>
      )}
    </div>
  );
}

export function SelectField({ label, type = "single", options, value, onChange, howTo, info, placeholder, hint }) {
  const kit = useKit();
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
    <FieldShell label={label} hint={hint} howTo={howTo} info={info}>
      <div className="select-wrap" ref={ref}>
        <input
          className="select-input"
          value={value || ""}
          placeholder={placeholder || (type === "multi" ? "Type or select, comma separated..." : "Type or select...")}
          onFocus={() => setOpen(true)}
          onChange={(e) => onChange(e.target.value)}
        />
        {kit.compactSelect ? (
          <button type="button" className="select-btn" onClick={() => setOpen((o) => !o)} aria-label="Choose from list">
            ▾
          </button>
        ) : (
          <button type="button" className="select-btn" onClick={() => setOpen((o) => !o)}>
            Select ⌄
          </button>
        )}
        {open && <SelectPopover options={options} multi={type === "multi"} value={value} onChange={onChange} onClose={() => setOpen(false)} />}
      </div>
    </FieldShell>
  );
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function DateWheelColumn({ items, selected, onSelect }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = el.querySelector(".date-wheel-item-active");
    if (active) active.scrollIntoView({ block: "center" });
  }, []);
  return (
    <div className="date-wheel-col" ref={ref}>
      {items.map((it) => (
        <button
          type="button"
          key={it.value}
          className={"date-wheel-item" + (String(selected) === String(it.value) ? " date-wheel-item-active" : "")}
          onClick={() => onSelect(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* Fast "scroll and tap" Day / Month / Year picker for surgery/injury dates
   -- Aditi: "I want to select from the list date, year, month ... like a
   scrolling thing and select from it" instead of typing DD/MM/YYYY by hand.
   Stores the same "DD/MM/YYYY" string TextField used, so it's a drop-in
   replacement everywhere a surgery/onset date is captured. */
export function DateField({ label, value, onChange, hint, howTo }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const parts = (value || "").split("/");
  const day = parts[0] || "";
  const month = parts[1] || "";
  const year = parts[2] || "";

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function setPart(which, v) {
    const d = which === "day" ? v : day;
    const m = which === "month" ? v : month;
    const y = which === "year" ? v : year;
    onChange([d, m, y].filter(Boolean).length ? `${d || "--"}/${m || "--"}/${y || "----"}` : "");
  }

  const days = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1).padStart(2, "0"), label: String(i + 1) }));
  const months = MONTH_NAMES.map((m, i) => ({ value: String(i + 1).padStart(2, "0"), label: m }));
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => thisYear - 100 + i).reverse().map((y) => ({ value: String(y), label: String(y) }));

  const display = day && month && year ? `${day}/${month}/${year}` : "";

  return (
    <FieldShell label={label} hint={hint} howTo={howTo}>
      <div className="select-wrap" ref={ref}>
        <input className="select-input" readOnly value={display} placeholder="DD/MM/YYYY" onFocus={() => setOpen(true)} />
        <button type="button" className="select-btn" onClick={() => setOpen((o) => !o)}>
          📅 Pick
        </button>
        {open && (
          <div className="select-popover date-wheel-popover">
            <div className="popover-head">
              <span>Select date</span>
              <button type="button" className="popover-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="date-wheel-row">
              <DateWheelColumn items={days} selected={day} onSelect={(v) => setPart("day", v)} />
              <DateWheelColumn items={months} selected={month} onSelect={(v) => setPart("month", v)} />
              <DateWheelColumn items={years} selected={year} onSelect={(v) => setPart("year", v)} />
            </div>
            <button type="button" className="popover-done" onClick={() => setOpen(false)}>Done</button>
          </div>
        )}
      </div>
    </FieldShell>
  );
}


// variant="chips" is an opt-in alternate look -- individually bordered
// pills with a solid-purple selected state, instead of the default shared
// lavender tray -- for pickers where that tray reads as visually flat
// (e.g. Treatment Techniques' 7-option type picker). Default rendering
// (every other Segmented call site) is completely unchanged. Each option
// can be a plain string (as before) or { label, icon } to show an icon --
// only used by the chips variant, ignored otherwise.
export function Segmented({ label, options, value, onChange, hint, howTo, info, wrap, variant }) {
  if (variant === "chips") {
    return (
      <FieldShell label={label} hint={hint} howTo={howTo} info={info}>
        <div className="chip-row">
          {options.map((o) => {
            const opt = typeof o === "object" ? o : { label: o, icon: null };
            const active = value === opt.label;
            return (
              <button
                type="button"
                key={opt.label}
                className={"chip-btn" + (active ? " chip-active" : "")}
                onClick={() => onChange(active ? "" : opt.label)}
              >
                {opt.icon && <span className="chip-icon">{opt.icon}</span>}
                {opt.label}
              </button>
            );
          })}
        </div>
      </FieldShell>
    );
  }
  return (
    <FieldShell label={label} hint={hint} howTo={howTo} info={info}>
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

export function NumberField({ label, value, onChange, unit, placeholder, hint, howTo, info, width }) {
  return (
    <div className="vital-field" style={width ? { flexBasis: width } : undefined}>
      {label && (
        <div className="vital-label-row">
          <span className="vital-label">{label}</span>
          <FieldHelp info={info} howTo={howTo} />
        </div>
      )}
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

// Collapsed-by-default vital sign row -- shows the (usually already-normal)
// value directly in the row with a maximize (+) button; tapping it opens
// the real input to change the value. Distinct from the old CSelectField/
// CollapsibleField pattern (removed from Cardio) which collapsed *empty*
// fields and hid their info button -- here the field already has a value
// before it's ever opened, and the ⓘ/howTo button always stays visible in
// the collapsed row, not swallowed by the toggle.
export function VitalRow({ label, value, onChange, unit, howTo, richItem, slider, max = 10, step = 1 }) {
  const [open, setOpen] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== "";
  return (
    <div className={"vital-chip" + (open ? " vital-chip-open" : "")}>
      <div className="vital-chip-head" onClick={() => setOpen((o) => !o)} role="button">
        <span className="vital-chip-label">{label}</span>
        {(howTo || richItem) && (
          <span onClick={(e) => e.stopPropagation()}>
            <InfoButton text={howTo} title={label} richItem={richItem} />
          </span>
        )}
        <span className="vital-chip-value">{hasValue ? `${value}${unit ? " " + unit : ""}` : "—"}</span>
        <button
          type="button"
          className="vital-chip-toggle"
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          aria-label={open ? "Minimize" : "Maximize"}
        >
          {open ? "−" : "+"}
        </button>
      </div>
      {open && (
        <div className="vital-chip-body" onClick={(e) => e.stopPropagation()}>
          {slider ? (
            <div className="scale-wrap">
              <input type="range" min={0} max={max} step={1} value={hasValue ? Number(value) : 0} onChange={(e) => onChange(e.target.value)} className="scale-range" />
              <span className="scale-readout">
                {hasValue ? value : 0}
                <span className="scale-max">/{max}</span>
              </span>
            </div>
          ) : (
            <div className="vital-input-wrap">
              <Stepper value={value} onChange={onChange} min={0} max={max} step={step} />
              {unit && <span className="vital-unit">{unit}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TextArea({ label, value, onChange, placeholder, hint, howTo, info }) {
  return (
    <FieldShell label={label} hint={hint} howTo={howTo} info={info}>
      {useKit().classicLayout ? (
        <textarea className="textarea" rows={2} value={value || ""} placeholder={placeholder || "Type here..."} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div>
          <textarea className="textarea" rows={2} value={value || ""} placeholder={placeholder || "Type here..."} onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
    </FieldShell>
  );
}

export function ScaleField({ label, value, onChange, hint, howTo, info, max = 10 }) {
  const kit = useKit();
  const v = value === undefined || value === "" ? 0 : Number(value);
  return (
    <FieldShell label={label} hint={hint} howTo={howTo} info={info}>
      <div className="scale-wrap">
        <input type="range" min={0} max={max} step={kit.scaleStep || 1} value={v} style={{ minWidth: 0 }} onChange={(e) => onChange(e.target.value)} className="scale-range" />
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


/* Compact L/R numeric stepper — value + up/down mini-buttons. Colour
   communicates clinical meaning, never decoration: pass `colorize` for the
   built-in MMT scale (0–3 red, 4 amber, 5 green), or pass an explicit
   `tone` ("normal" | "mild" | "severe") when the caller has its own
   comparison logic (e.g. ROM value vs textbook norm). */
// `placeholder` is the faint hint shown while the box is empty (default "--"); `startAt` is
// where the arrows begin counting from when the box is empty (ROM passes the movement's
// normal value, so the box can stay empty -- nothing looks entered -- while typing, or
// nudging from normal with the arrows, both still work).
export function Stepper({ value, onChange, min = 0, max = 99, step = 1, colorize, tone: toneProp, square, large, placeholder = "--", startAt }) {
  const num = value === undefined || value === "" ? null : Number(value);
  function bump(delta) {
    const base = num === null ? (startAt != null ? Number(startAt) : min > 0 ? min : 0) : num;
    const next = Math.min(max, Math.max(min, base + delta));
    onChange(String(next));
  }
  let tone = "";
  if (toneProp) tone = toneProp ? " stepper-" + toneProp : "";
  else if (colorize && num !== null) tone = num >= 5 ? " stepper-normal" : num === 4 ? " stepper-mild" : " stepper-severe";

  // Square mode (2026-09-11, Aditi: first pass with separate [−]/[+]
  // buttons either side of the number was "totally wrong" -- wanted the
  // original up/down-arrow layout back, just bigger, with the number box
  // and the arrow block still visually separate pieces. So: same ▲-over-▼
  // stacked arrow shape as the base .stepper, but as its own block next to
  // the number box (a real gap between them, not fused into one bordered
  // container), and each arrow button roughly doubled from the old
  // 22×15px. Plain (non-square) Stepper -- the thin 68px-wide fields used
  // all over ROM/MMT/etc -- is untouched.
  if (square) {
    return (
      <div className={"stepper-sq-row" + tone}>
        <input
          className="stepper-sq-input"
          type="number"
          inputMode="decimal"
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="stepper-sq-arrows">
          <button type="button" className="stepper-sq-arrow" onClick={() => bump(step)} aria-label="Increase">▲</button>
          <button type="button" className="stepper-sq-arrow" onClick={() => bump(-step)} aria-label="Decrease">▼</button>
        </div>
      </div>
    );
  }

  return (
    <div className={"stepper" + (large ? " stepper-lg" : "") + tone}>
      <input
        className="stepper-input"
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        placeholder={placeholder}
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

// `action` (2026-09-16, Aditi: "the magnifying glass should be in the top
// right") -- an optional right-aligned slot in the title row, e.g. Care
// Plan Treatment's search toggle, instead of it rendering on its own row
// with dead space above the section content.
export function SectionIntro({ icon, title, sub, info, action, titleAs }) {
  const kit = useKit();
  if (kit.classicLayout) {
    const ClassicTitle = titleAs;
    return (
      <div className="section-intro">
        {icon && <div className="section-intro-icon">{icon}</div>}
        <div>
          {ClassicTitle ? <ClassicTitle>{title}</ClassicTitle> : <div className="section-intro-title">{title}</div>}
          {sub && <div className="section-intro-sub">{sub}</div>}
        </div>
      </div>
    );
  }
  const TitleAs = titleAs || SectionTitle;
  return (
    <div className="section-intro">
      {icon && <div className="section-intro-icon">{icon}</div>}
      <div style={{ flex: 1 }}>
        <div className="section-intro-title-row">
          <TitleAs>{title}</TitleAs>
          {info && <InfoButton text={info} />}
          {action && <div style={{ marginLeft: "auto" }}>{action}</div>}
        </div>
        {sub && <div className="section-intro-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* Top step nav — small circles per step, tap to jump anywhere.
   Scrolls only its own horizontal strip (container.scrollTo) instead of
   el.scrollIntoView, which can drag the whole page vertically when the
   active circle is near the edge of the screen (Neuro's fix, now shared). */
export function StepNav({ steps, currentIndex, visited, onJump, onAddClick, requiredIds }) {
  const kit = useKit();
  const refs = useRef([]);
  useEffect(() => {
    const el = refs.current[currentIndex];
    const container = el && el.parentElement;
    if (el && container && container.scrollTo) {
      const target = el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left: target, behavior: "smooth" });
    }
  }, [currentIndex]);
  const addLabel = kit.addStepLabel || "Add assessment";
  return (
    <div className="step-nav">
      {steps.map((s, i) => {
        const active = i === currentIndex;
        const seen = visited.has(s.id) && !active;
        // Red star badge (2026-09-16, Aditi: "let it shows I want it to be
        // there... it need to be filled out because the condition we have
        // chosen") -- the condition card's own `promote` list already names
        // exactly which steps that clinical context calls for; this just
        // makes that visible on the step itself instead of only reordering
        // it silently. Clears once the therapist actually visits the step.
        const required = requiredIds && requiredIds.has(s.id) && !visited.has(s.id);
        return (
          <button
            key={s.id}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            className={"step-circle" + (active ? " step-active" : seen ? " step-seen" : "")}
            onClick={() => onJump(i)}
            aria-label={required ? `${s.label} — required for this condition` : s.label}
            title={required ? `${s.label} — required for this condition` : s.label}
          >
            <span className="step-circle-ring">
              {kit.classicLayout ? s.icon : <span className="step-circle-icon">{s.icon}</span>}
              {required && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: "50%",
                    background: "#DC2626", border: "1.5px solid #fff", fontSize: 7, lineHeight: "7px",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  ★
                </span>
              )}
            </span>
            <span className="step-circle-label">{stepBarLabel(s.label)}</span>
          </button>
        );
      })}
      <button type="button" className="step-circle step-add" onClick={onAddClick} aria-label={addLabel} title={addLabel}>
        <span className="step-circle-ring">
          {kit.classicLayout ? "+" : <span className="step-circle-icon">+</span>}
        </span>
        <span className="step-circle-label">Add</span>
      </button>
    </div>
  );
}

// Labels that do not fit the 56px step-bar circle ("Demograp...", "General Observatic...")
// get a shorter wording there. The full name is still the tooltip and the screen heading.
// "\u00AD" is a soft hyphen: the word may break there ("Neuro-" / "vascular") and
// shows a hyphen only if it does.
const STEP_BAR_SHORT_LABELS = {
  "Demographics": "Patient",
  "General Observation": "Observe",
  "Observation": "Observe",
  "Neurovascular": "Neuro\u00ADvascular",
  "Precautions & Safety": "Safety",
  "Neurological Screen": "Neuro Screen",
  "Functional Mobility": "Mobility",
  "Gait / Ambulation": "Gait",
  "MMT / Muscle Activation": "MMT",
};
export function stepBarLabel(label) {
  return STEP_BAR_SHORT_LABELS[label] || label;
}

export function useSectionData(data, setData, key) {
  const section = data[key] || {};
  const set = (field, value) => setData((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  // Merges several fields in one update -- used by "Mark all normal" quick-pick
  // buttons so the whole batch lands as a single state change, not one render
  // per field.
  const setMany = (fields) => setData((prev) => ({ ...prev, [key]: { ...prev[key], ...fields } }));
  return [section, set, setMany];
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

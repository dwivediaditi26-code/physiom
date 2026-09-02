import React, { useState, useMemo, useRef, useEffect, useContext, createContext } from "react";
import { createPortal } from "react-dom";
import InfoCard from "./InfoCard.jsx";
import CardioTreatmentAssistant from "./CardioTreatmentAssistant.jsx";
import { cardiovascularData } from "./cardiovascularData.js";
import { respiratoryData } from "./respiratoryData.js";

// Opens the rich InfoCard overlay from anywhere in the field tree below
// CardiopulmonaryAssessment without prop-drilling a setter through every
// wrapper (TextField/SelectField/NumberField/etc all sit between a section
// and FieldShell). Provided once, near the bottom of the default export.
const InfoCardContext = createContext(null);

/* ============================================================
   BRAND / TOKENS — matches existing PhysioMind purple system
   ============================================================ */
const BRAND = {
  purple: "#6C4DFF",
  purpleDark: "#5638E0",
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
   STATIC DATA — Step 1 / Step 2 selectors
   5 settings × 3 systems = 15 pathway templates
   ============================================================ */
const SETTINGS = [
  { id: "inpatient", icon: "🏥", label: "Inpatient", desc: "Acute / ward patient" },
  { id: "icu", icon: "🚨", label: "ICU", desc: "Critical care, closely monitored" },
  { id: "postop", icon: "🛏️", label: "Post-operative", desc: "Recovery after surgery" },
  { id: "outpatient", icon: "🚶", label: "Outpatient", desc: "OPD / clinic-based" },
  { id: "rehab", icon: "🏃", label: "Rehabilitation", desc: "Structured cardiac / pulmonary / combined rehab" },
];

const SYSTEMS = [
  { id: "cardio", icon: "🫀", label: "Cardiovascular", desc: "Heart & circulation" },
  { id: "resp", icon: "🫁", label: "Respiratory", desc: "Lungs & breathing" },
  { id: "combined", icon: "🫀🫁", label: "Combined", desc: "Cardiovascular + respiratory" },
];

function rehabSubLabel(system) {
  if (system === "cardio") return "Cardiac Rehabilitation";
  if (system === "resp") return "Pulmonary Rehabilitation";
  if (system === "combined") return "Cardiopulmonary Rehabilitation";
  return "";
}

const STEP_META = [
  { id: "setting", label: "Setting" },
  { id: "system", label: "System" },
  { id: "demographics", icon: "📋", label: "Patient Information" },
  { id: "safety", icon: "🚩", label: "Safety Screening" },
  { id: "subjective", icon: "📝", label: "Subjective Assessment" },
  { id: "chart", icon: "🗂️", label: "Medical / Chart Review" },
  { id: "vitals", icon: "❤️", label: "Baseline Vitals" },
  { id: "cardio", icon: "🫀", label: "Cardiovascular Examination" },
  { id: "resp", icon: "🫁", label: "Respiratory Examination" },
  { id: "functional", icon: "🚶", label: "Functional Capacity" },
  { id: "exercise", icon: "🏃", label: "Exercise Response" },
  { id: "outcomes", icon: "📊", label: "Outcome Measures" },
  { id: "interpretation", icon: "🧠", label: "Clinical Interpretation" },
  { id: "precautions", icon: "⚠️", label: "Treatment Precautions" },
  { id: "summary", icon: "✅", label: "Summary & Review" },
];
const ASSESS_STEPS = STEP_META.slice(2); // 13 steps shown in the step nav

/* ============================================================
   GENERIC FIELD COMPONENTS
   ============================================================ */
function Hint({ children }) {
  if (!children) return null;
  return <div className="hint">💡 {children}</div>;
}

function InfoButton({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="info-btn-wrap">
      <button type="button" className="info-btn" onClick={() => setOpen(true)}>
        ℹ How to
      </button>
      {open && createPortal(
        <div className="info-popover-backdrop" onClick={() => setOpen(false)}>
          <div className="info-popover" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="info-popover-close" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
            <p>{text}</p>
          </div>
        </div>,
        document.body
      )}
    </span>
  );
}

// Small ⓘ trigger for the rich InfoCard overlay (Perform/Scale/Interpret
// tabs) -- replaces the plain-text InfoButton wherever a field has a
// matching cardiovascularData/respiratoryData entry. Sits inline with the
// label, same row, no extra vertical space.
function InfoCardButton({ data }) {
  const openCard = useContext(InfoCardContext);
  return (
    <button type="button" className="info-card-btn" onClick={() => openCard?.(data)} title={`Learn: ${data.title}`} aria-label={`Learn: ${data.title}`}>
      ⓘ
    </button>
  );
}

function FieldShell({ label, hint, howTo, info, children }) {
  return (
    <div className="field-block">
      {label && (
        <div className="field-label-row">
          <span className="field-label">{label}</span>
          {info ? <InfoCardButton data={info} /> : howTo && <InfoButton text={howTo} />}
        </div>
      )}
      {children}
      <Hint>{hint}</Hint>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, hint, howTo, info, unit }) {
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
  // on a real phone, 4-8 of those plus the header/Done button pushed well
  // past the fold, so opening a symptom list buried its own confirm button
  // off-screen. Now a compact checklist (thin divider rows, a small check/
  // radio box instead of a full color-fill flip) with its OWN capped,
  // internally-scrolling list -- the header and Done stay pinned and
  // visible no matter how many options a field has.
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

function SelectField({ label, type = "single", options, value, onChange, howTo, info, placeholder, hint }) {
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
        <button type="button" className="select-btn" onClick={() => setOpen((o) => !o)}>
          Select ⌄
        </button>
        {open && (
          <SelectPopover options={options} multi={type === "multi"} value={value} onChange={onChange} onClose={() => setOpen(false)} />
        )}
      </div>
    </FieldShell>
  );
}

function Segmented({ label, options, value, onChange, hint, howTo, info }) {
  return (
    <FieldShell label={label} hint={hint} howTo={howTo} info={info}>
      <div className="segmented">
        {options.map((o) => (
          <button
            type="button"
            key={o}
            className={"seg-btn" + (value === o ? " seg-active" : "")}
            onClick={() => onChange(value === o ? "" : o)}
          >
            {o}
          </button>
        ))}
      </div>
    </FieldShell>
  );
}

function NumberField({ label, value, onChange, unit, placeholder, hint, howTo, info, width }) {
  return (
    <div className="vital-field" style={width ? { flexBasis: width } : undefined}>
      {label && (
        <div className="vital-label-row">
          <span className="vital-label">{label}</span>
          {info ? <InfoCardButton data={info} /> : howTo && <InfoButton text={howTo} />}
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

function TextArea({ label, value, onChange, placeholder, hint, howTo, info }) {
  return (
    <FieldShell label={label} hint={hint} howTo={howTo} info={info}>
      <textarea
        className="textarea"
        rows={2}
        value={value || ""}
        placeholder={placeholder || "Type here..."}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

function ScaleField({ label, value, onChange, hint, howTo, info, max = 10 }) {
  const v = value === undefined || value === "" ? 0 : Number(value);
  return (
    <FieldShell label={label} hint={hint} howTo={howTo} info={info}>
      <div className="scale-wrap">
        <input
          type="range"
          min={0}
          max={max}
          step={0.5}
          value={v}
          style={{ minWidth: 0 }}
          onChange={(e) => onChange(e.target.value)}
          className="scale-range"
        />
        <span className="scale-readout">
          {value === undefined || value === "" ? "—" : v}
          <span className="scale-max">/{max}</span>
        </span>
      </div>
    </FieldShell>
  );
}

function LRGrid({ label, rows, columns = ["Right", "Left"], options, value = {}, onChange, hint, howTo, info }) {
  return (
    <FieldShell label={label} hint={hint} howTo={howTo} info={info}>
      <div className="lr-grid">
        <div className="lr-row lr-head">
          <div className="lr-cell lr-zone" />
          {columns.map((c) => (
            <div className="lr-cell lr-colhead" key={c}>
              {c}
            </div>
          ))}
        </div>
        {rows.map((r) => (
          <div className="lr-row" key={r}>
            <div className="lr-cell lr-zone">{r}</div>
            {columns.map((c) => {
              const key = `${r}__${c}`;
              return (
                <div className="lr-cell" key={c}>
                  <select
                    className="lr-select"
                    value={value[key] || ""}
                    onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                  >
                    <option value="">–</option>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
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

function Alert({ tone = "amber", children }) {
  return <div className={"alert alert-" + tone}>{children}</div>;
}

function SectionIntro({ icon, title, sub }) {
  return (
    <div className="section-intro">
      <div className="section-intro-icon">{icon}</div>
      <div>
        <div className="section-intro-title">{title}</div>
        {sub && <div className="section-intro-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* Top step nav — small circles per step, tap to jump anywhere */
function StepNav({ steps, currentIndex, visited, onJump, onAddClick }) {
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
      <button type="button" className="step-circle step-add" onClick={onAddClick} aria-label="Add a custom step" title="Add a custom step">
        +
      </button>
    </div>
  );
}

/* Fixed cardiothoracic assessment library — the only source for "+ Add Assessment" */
const CT_LIBRARY = [
  {
    cat: "Cardiovascular",
    icon: "🫀",
    items: ["Pulse assessment", "Peripheral circulation", "Capillary refill", "Peripheral edema", "Orthostatic BP", "Heart rate response", "Blood pressure response", "Rhythm assessment", "Cardiac auscultation"],
  },
  {
    cat: "Respiratory",
    icon: "🫁",
    items: ["Respiratory rate", "Breathing pattern", "Chest expansion", "Chest percussion", "Breath sounds / auscultation", "Cough assessment", "Sputum assessment", "Airway clearance assessment", "Dyspnea assessment"],
  },
  {
    cat: "Functional / Exercise",
    icon: "🏃",
    items: ["6-Minute Walk Test", "2-Minute Walk Test", "1-Minute Sit-to-Stand", "5× Sit-to-Stand", "TUG", "Stair assessment", "Exercise tolerance"],
  },
  {
    cat: "Outcome Measures",
    icon: "📈",
    items: ["mMRC Dyspnea Scale", "Borg Dyspnea", "Borg RPE", "CAT", "Other cardiothoracic outcome"],
  },
  {
    cat: "Other Cardiothoracic",
    icon: "🩺",
    items: ["Postural assessment", "Thoracic mobility", "Respiratory muscle assessment", "Inspiratory muscle strength", "Peak expiratory flow"],
  },
];

function ctId(cat, label) {
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `ct-${slug(cat)}-${slug(label)}`;
}

/* Each library item renders with the SAME field widgets/options as they appear in the
   main assessment sections above — not a generic notes box. Items with no main-assessment
   equivalent (orthostatic BP, thoracic mobility, etc.) get a purpose-built structured field set. */
const CT_RENDERERS = {
  [ctId("Cardiovascular", "Pulse assessment")]: (d, set) => (
    <LRGrid
      label="Peripheral pulses"
      rows={["Radial", "Dorsalis pedis", "Posterior tibial"]}
      options={["Present", "Reduced", "Absent", "Irregular"]}
      value={d.pulses || {}}
      onChange={(v) => set("pulses", v)}
      info={cardiovascularData.pulses}
    />
  ),
  [ctId("Cardiovascular", "Peripheral circulation")]: (d, set) => (
    <>
      <SelectField label="Skin colour" type="single" options={["Normal", "Pale", "Cyanotic", "Mottled"]} value={d.skinColour} onChange={(v) => set("skinColour", v)} info={cardiovascularData.skinColour} />
      <SelectField label="Temperature" type="single" options={["Warm", "Cool", "Unequal"]} value={d.temperature} onChange={(v) => set("temperature", v)} info={cardiovascularData.skinTemperature} />
    </>
  ),
  [ctId("Cardiovascular", "Capillary refill")]: (d, set) => (
    <NumberField label="Capillary refill" value={d.capRefill} onChange={(v) => set("capRefill", v)} unit="sec" info={cardiovascularData.capRefill} />
  ),
  [ctId("Cardiovascular", "Peripheral edema")]: (d, set) => (
    <>
      <SelectField
        label="Edema"
        type="single"
        options={["None", "Mild", "Moderate", "Severe"]}
        value={d.edema}
        onChange={(v) => set("edema", v)}
        info={cardiovascularData.edema}
      />
      <SelectField label="Edema location" type="multi" options={["Right ankle", "Left ankle", "Bilateral ankle", "Lower leg", "Generalized", "Sacral"]} value={d.edemaLocation} onChange={(v) => set("edemaLocation", v)} />
    </>
  ),
  [ctId("Cardiovascular", "Orthostatic BP")]: (d, set) => (
    <>
      <div className="vitals-grid">
        <NumberField label="Supine HR" value={d.supineHR} onChange={(v) => set("supineHR", v)} unit="bpm" />
        <NumberField label="Supine BP sys" value={d.supineBPs} onChange={(v) => set("supineBPs", v)} unit="mmHg" />
        <NumberField label="Standing HR (1 min)" value={d.standHR} onChange={(v) => set("standHR", v)} unit="bpm" />
        <NumberField label="Standing BP sys (1 min)" value={d.standBPs} onChange={(v) => set("standBPs", v)} unit="mmHg" />
      </div>
      <SelectField
        label="Symptoms on standing"
        type="multi"
        options={["None", "Dizziness", "Light-headedness", "Blurred vision", "Palpitations", "Near-syncope"]}
        value={d.symptoms}
        onChange={(v) => set("symptoms", v)}
        info={cardiovascularData.orthostatic}
      />
    </>
  ),
  [ctId("Cardiovascular", "Heart rate response")]: (d, set) => (
    <>
      <div className="vitals-grid">
        <NumberField label="Resting HR" value={d.restHR} onChange={(v) => set("restHR", v)} unit="bpm" width="30%" />
        <NumberField label="Peak HR" value={d.peakHR} onChange={(v) => set("peakHR", v)} unit="bpm" width="30%" />
        <NumberField label="Recovery HR (1-2 min)" value={d.recoveryHR} onChange={(v) => set("recoveryHR", v)} unit="bpm" width="30%" info={cardiovascularData.hrRecovery} />
      </div>
      <SelectField label="Response pattern" type="single" options={["Appropriate rise", "Blunted response", "Excessive rise", "Chronotropic incompetence suspected"]} value={d.pattern} onChange={(v) => set("pattern", v)} info={cardiovascularData.exerciseHRResponse} />
    </>
  ),
  [ctId("Cardiovascular", "Blood pressure response")]: (d, set) => (
    <>
      <div className="vitals-grid">
        <NumberField label="Resting BP sys" value={d.restBPs} onChange={(v) => set("restBPs", v)} unit="mmHg" width="30%" />
        <NumberField label="Peak BP sys" value={d.peakBPs} onChange={(v) => set("peakBPs", v)} unit="mmHg" width="30%" />
        <NumberField label="Recovery BP sys" value={d.recoveryBPs} onChange={(v) => set("recoveryBPs", v)} unit="mmHg" width="30%" info={cardiovascularData.bpRecovery} />
      </div>
      <SelectField
        label="Response pattern"
        type="single"
        options={["Normal rise", "Hypotensive response", "Exaggerated hypertensive response", "Failure to rise"]}
        value={d.pattern}
        onChange={(v) => set("pattern", v)}
        info={cardiovascularData.exerciseBPResponse}
      />
    </>
  ),
  [ctId("Cardiovascular", "Rhythm assessment")]: (d, set) => (
    <SelectField label="Rhythm" type="single" options={["Regular", "Irregular", "Known arrhythmia", "Unknown/not assessed"]} value={d.rhythm} onChange={(v) => set("rhythm", v)} info={cardiovascularData.pulseRhythm} />
  ),
  [ctId("Cardiovascular", "Cardiac auscultation")]: (d, set) => (
    <>
      <SelectField
        label="Sounds heard"
        type="multi"
        options={["S1 normal", "S2 normal", "S3 present", "S4 present", "Murmur present"]}
        value={d.heartSounds}
        onChange={(v) => set("heartSounds", v)}
        info={cardiovascularData.cardiacAuscultation}
      />
      {String(d.heartSounds || "").includes("Murmur present") && (
        <TextArea label="Murmur description" value={d.murmurDesc} onChange={(v) => set("murmurDesc", v)} placeholder="Timing, location, character..." info={cardiovascularData.murmurs} />
      )}
    </>
  ),
  [ctId("Respiratory", "Respiratory rate")]: (d, set) => (
    <NumberField label="Respiratory rate" value={d.rr} onChange={(v) => set("rr", v)} unit="/min" info={respiratoryData.respRate} />
  ),
  [ctId("Respiratory", "Breathing pattern")]: (d, set) => (
    <>
      <SelectField label="Breathing pattern" type="single" options={["Normal", "Tachypnea", "Bradypnea", "Laboured", "Shallow", "Irregular"]} value={d.pattern} onChange={(v) => set("pattern", v)} info={respiratoryData.respRate} />
      <SelectField label="Breathing pattern type" type="single" options={["Diaphragmatic", "Upper chest", "Thoracoabdominal", "Paradoxical"]} value={d.patternType} onChange={(v) => set("patternType", v)} info={respiratoryData.breathingPattern} />
    </>
  ),
  [ctId("Respiratory", "Chest expansion")]: (d, set) => (
    <SelectField
      label="Chest expansion"
      type="single"
      options={["Symmetrical", "Reduced right", "Reduced left", "Globally reduced"]}
      value={d.expansion}
      onChange={(v) => set("expansion", v)}
      info={respiratoryData.chestExpansion}
    />
  ),
  [ctId("Respiratory", "Chest percussion")]: (d, set) => (
    <LRGrid
      label="Percussion"
      rows={["Upper", "Middle", "Lower"]}
      options={["Resonant", "Dull", "Stony dull", "Hyperresonant"]}
      value={d.percussion || {}}
      onChange={(v) => set("percussion", v)}
      howTo="Left middle finger flat on the chest, strike its middle joint with the right middle fingertip, relaxed wrist. Compare side to side, top to bottom. Resonant = normal. Dull = consolidation. Stony dull = effusion. Hyperresonant = pneumothorax."
    />
  ),
  [ctId("Respiratory", "Breath sounds / auscultation")]: (d, set) => (
    <LRGrid
      label="Auscultation"
      rows={["Upper", "Middle", "Lower"]}
      options={["Normal", "Reduced", "Crackles", "Wheeze", "Rhonchi", "Bronchial"]}
      value={d.auscultation || {}}
      onChange={(v) => set("auscultation", v)}
      info={respiratoryData.breathSounds}
    />
  ),
  [ctId("Respiratory", "Cough assessment")]: (d, set) => (
    <SelectField
      label="Cough"
      type="single"
      options={["None", "Dry", "Productive", "Weak / ineffective", "Painful"]}
      value={d.cough}
      onChange={(v) => set("cough", v)}
      info={respiratoryData.cough}
    />
  ),
  [ctId("Respiratory", "Sputum assessment")]: (d, set) => (
    <>
      <SelectField label="Sputum amount" type="single" options={["None", "Scant", "Moderate", "Large"]} value={d.sputumAmount} onChange={(v) => set("sputumAmount", v)} />
      <SelectField
        label="Sputum colour"
        type="single"
        options={["Clear", "White", "Yellow", "Green", "Blood-stained"]}
        value={d.sputumColour}
        onChange={(v) => set("sputumColour", v)}
        hint={d.sputumColour === "Green" ? "Suggests infection." : d.sputumColour === "Blood-stained" ? "Haemoptysis — ranges from streaks to frank blood; correlate urgently." : undefined}
        info={respiratoryData.sputum}
      />
      <SelectField label="Sputum consistency" type="single" options={["Thin", "Thick", "Tenacious"]} value={d.sputumConsistency} onChange={(v) => set("sputumConsistency", v)} />
    </>
  ),
  [ctId("Respiratory", "Airway clearance assessment")]: (d, set) => (
    <>
      <SelectField label="Airway clearance ability" type="single" options={["Effective independent cough", "Reduced/weak cough", "Ineffective — unable to clear", "Dependent on suction"]} value={d.ability} onChange={(v) => set("ability", v)} />
      <SelectField label="Technique used" type="multi" options={["Huffing", "ACBT", "Postural drainage", "Percussion/vibration", "Suction", "PEP device", "Other"]} value={d.technique} onChange={(v) => set("technique", v)} />
    </>
  ),
  [ctId("Respiratory", "Dyspnea assessment")]: (d, set) => (
    <>
      <ScaleField label="Dyspnea at rest" value={d.dyspneaRest} onChange={(v) => set("dyspneaRest", v)} info={respiratoryData.borg} />
      <ScaleField label="Dyspnea on activity" value={d.dyspneaActivity} onChange={(v) => set("dyspneaActivity", v)} info={respiratoryData.borg} />
    </>
  ),
  [ctId("Functional / Exercise", "6-Minute Walk Test")]: (d, set) => (
    <>
      <NumberField label="Distance" value={d.distance} onChange={(v) => set("distance", v)} unit="m" />
      <div className="vitals-grid">
        <NumberField label="Pre HR" value={d.preHR} onChange={(v) => set("preHR", v)} unit="bpm" width="30%" />
        <NumberField label="Pre SpO₂" value={d.preSpO2} onChange={(v) => set("preSpO2", v)} unit="%" width="30%" />
        <NumberField label="Pre Borg" value={d.preBorg} onChange={(v) => set("preBorg", v)} unit="/10" width="30%" />
        <NumberField label="Post HR" value={d.postHR} onChange={(v) => set("postHR", v)} unit="bpm" width="30%" />
        <NumberField label="Post SpO₂" value={d.postSpO2} onChange={(v) => set("postSpO2", v)} unit="%" width="30%" />
        <NumberField label="Post Borg" value={d.postBorg} onChange={(v) => set("postBorg", v)} unit="/10" width="30%" />
      </div>
      <SelectField
        label="Reason for stopping"
        type="single"
        options={["Completed", "Dyspnea", "Fatigue", "Chest discomfort", "Dizziness", "Desaturation", "Other"]}
        value={d.stopReason}
        onChange={(v) => set("stopReason", v)}
        info={cardiovascularData.sixMWT}
      />
    </>
  ),
  [ctId("Functional / Exercise", "2-Minute Walk Test")]: (d, set) => (
    <>
      <NumberField label="Distance" value={d.distance} onChange={(v) => set("distance", v)} unit="m" />
      <div className="vitals-grid">
        <NumberField label="Pre HR" value={d.preHR} onChange={(v) => set("preHR", v)} unit="bpm" width="45%" />
        <NumberField label="Pre SpO₂" value={d.preSpO2} onChange={(v) => set("preSpO2", v)} unit="%" width="45%" />
        <NumberField label="Post HR" value={d.postHR} onChange={(v) => set("postHR", v)} unit="bpm" width="45%" />
        <NumberField label="Post SpO₂" value={d.postSpO2} onChange={(v) => set("postSpO2", v)} unit="%" width="45%" />
      </div>
      <SelectField label="Reason for stopping" type="single" options={["Completed", "Dyspnea", "Fatigue", "Chest discomfort", "Dizziness", "Desaturation", "Other"]} value={d.stopReason} onChange={(v) => set("stopReason", v)} />
    </>
  ),
  [ctId("Functional / Exercise", "1-Minute Sit-to-Stand")]: (d, set) => (
    <>
      <NumberField label="Repetitions completed" value={d.reps} onChange={(v) => set("reps", v)} unit="reps/min" />
      <div className="vitals-grid">
        <NumberField label="Pre SpO₂" value={d.preSpO2} onChange={(v) => set("preSpO2", v)} unit="%" width="45%" />
        <NumberField label="Post SpO₂" value={d.postSpO2} onChange={(v) => set("postSpO2", v)} unit="%" width="45%" />
      </div>
      <ScaleField label="Borg dyspnea (post)" value={d.postBorg} onChange={(v) => set("postBorg", v)} />
    </>
  ),
  [ctId("Functional / Exercise", "5× Sit-to-Stand")]: (d, set) => (
    <>
      <NumberField label="Time to complete" value={d.time} onChange={(v) => set("time", v)} unit="sec" howTo="Arms crossed over chest, standard chair height, as fast as safely possible." />
      <SelectField label="Assistance required" type="single" options={["None", "Used arms", "Required physical assistance", "Unable to complete"]} value={d.assistance} onChange={(v) => set("assistance", v)} />
    </>
  ),
  [ctId("Functional / Exercise", "TUG")]: (d, set) => (
    <>
      <NumberField label="Time" value={d.time} onChange={(v) => set("time", v)} unit="sec" howTo="Stand from chair, walk 3m, turn, walk back, sit down. Over 13.5 sec is associated with increased falls risk." />
      <SelectField label="Walking aid used" type="single" options={["None", "Cane", "Walker/frame", "Other"]} value={d.aid} onChange={(v) => set("aid", v)} />
    </>
  ),
  [ctId("Functional / Exercise", "Stair assessment")]: (d, set) => (
    <>
      <NumberField label="Number of steps climbed" value={d.steps} onChange={(v) => set("steps", v)} unit="steps" />
      <SelectField label="Assistance level" type="single" options={["Independent", "Supervision", "Handrail only", "Physical assistance required", "Unable"]} value={d.assistance} onChange={(v) => set("assistance", v)} />
      <SelectField label="Symptoms on stairs" type="multi" options={["None", "Dyspnea", "Fatigue", "Chest discomfort", "Dizziness"]} value={d.symptoms} onChange={(v) => set("symptoms", v)} />
    </>
  ),
  [ctId("Functional / Exercise", "Exercise tolerance")]: (d, set) => (
    <>
      <SelectField label="Activity tolerance" type="single" options={["Good", "Fair", "Poor"]} value={d.tolerance} onChange={(v) => set("tolerance", v)} />
      <SelectField label="Walking" type="single" options={["Independent", "Walking aid", "Assistance required", "Unable to walk"]} value={d.walking} onChange={(v) => set("walking", v)} />
    </>
  ),
  [ctId("Outcome Measures", "mMRC Dyspnea Scale")]: (d, set) => (
    <SelectField
      label="mMRC dyspnea grade"
      type="single"
      options={MMRC}
      value={d.mmrc}
      onChange={(v) => set("mmrc", v)}
      info={respiratoryData.mmrc}
    />
  ),
  [ctId("Outcome Measures", "Borg Dyspnea")]: (d, set) => (
    <ScaleField label="Borg dyspnea" value={d.borg} onChange={(v) => set("borg", v)} info={respiratoryData.borg} />
  ),
  [ctId("Outcome Measures", "Borg RPE")]: (d, set) => <ScaleField label="Borg RPE" value={d.rpe} onChange={(v) => set("rpe", v)} info={cardiovascularData.borgRPE} />,
  [ctId("Outcome Measures", "CAT")]: (d, set) => <NumberField label="CAT score" value={d.cat} onChange={(v) => set("cat", v)} unit="/40" />,
  [ctId("Outcome Measures", "Other cardiothoracic outcome")]: (d, set) => (
    <TextArea label="Outcome measure" value={d.measure} onChange={(v) => set("measure", v)} placeholder="Name the measure and record the score" />
  ),
  [ctId("Other Cardiothoracic", "Postural assessment")]: (d, set) => (
    <SelectField label="Posture" type="multi" options={["Neutral", "Forward head", "Rounded shoulders", "Kyphotic", "Scoliotic", "Increased lumbar lordosis", "Other"]} value={d.posture} onChange={(v) => set("posture", v)} />
  ),
  [ctId("Other Cardiothoracic", "Thoracic mobility")]: (d, set) => (
    <>
      <SelectField label="Thoracic rotation" type="single" options={["Normal", "Mildly restricted", "Moderately restricted", "Severely restricted"]} value={d.rotation} onChange={(v) => set("rotation", v)} />
      <SelectField label="Thoracic extension" type="single" options={["Normal", "Mildly restricted", "Moderately restricted", "Severely restricted"]} value={d.extension} onChange={(v) => set("extension", v)} />
    </>
  ),
  [ctId("Other Cardiothoracic", "Respiratory muscle assessment")]: (d, set) => (
    <>
      <SelectField label="Accessory muscle use" type="single" options={["None", "Mild", "Moderate", "Severe"]} value={d.accessory} onChange={(v) => set("accessory", v)} />
      <SelectField label="Diaphragm excursion" type="single" options={["Normal", "Reduced", "Paradoxical"]} value={d.diaphragm} onChange={(v) => set("diaphragm", v)} />
    </>
  ),
  [ctId("Other Cardiothoracic", "Inspiratory muscle strength")]: (d, set) => (
    <NumberField
      label="MIP (Maximal Inspiratory Pressure)"
      value={d.mip}
      onChange={(v) => set("mip", v)}
      unit="cmH₂O"
      howTo="Measured via manometer at residual volume. Reference thresholds for respiratory muscle weakness vary by age/sex — correlate with normative values."
    />
  ),
  [ctId("Other Cardiothoracic", "Peak expiratory flow")]: (d, set) => (
    <NumberField label="PEF (Peak Expiratory Flow)" value={d.pef} onChange={(v) => set("pef", v)} unit="L/min" howTo="Best of 3 forced expiratory efforts via peak flow meter, standing if possible." />
  ),
};


/* Full-screen picker — cardiothoracic library only, checkbox multi-select, searchable */
function AddAssessmentModal({ addedIds, onToggle, onClose }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  return (
    <div className="ct-modal">
      <div className="ct-modal-header">
        <div className="ct-modal-title">🫀🫁 Add Cardiothoracic Assessment</div>
        <button type="button" className="ct-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="ct-search-wrap">
        <input className="ct-search" placeholder="🔍 Search assessment..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      <div className="ct-modal-body">
        {CT_LIBRARY.map((group) => {
          const items = query ? group.items.filter((it) => it.toLowerCase().includes(query)) : group.items;
          if (!items.length) return null;
          return (
            <div className="ct-group" key={group.cat}>
              <div className="ct-group-title">
                {group.icon} {group.cat.toUpperCase()}
              </div>
              {items.map((label) => {
                const id = ctId(group.cat, label);
                const checked = addedIds.has(id);
                return (
                  <button type="button" key={id} className={"ct-item" + (checked ? " ct-item-checked" : "")} onClick={() => onToggle(id, label, group.icon)}>
                    <span className="ct-checkbox">{checked ? "☑" : "☐"}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="ct-modal-footer">
        <button type="button" className="primary-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

/* Content editor for a library item added to the assessment — same fields as the original */
function CustomSection({ id, meta, data, setData }) {
  const [d, set] = useSectionData(data, setData, id);
  const renderer = CT_RENDERERS[id];
  return (
    <>
      <SectionIntro icon={meta.icon} title={meta.label} sub="Added from the cardiothoracic library." />
      {renderer ? renderer(d, set) : null}
      <TextArea label="Notes" value={d.notes} onChange={(v) => set("notes", v)} placeholder="Additional findings..." />
    </>
  );
}

/* ============================================================
   SECTION CONTENT
   ============================================================ */
function useSectionData(data, setData, key) {
  const section = data[key] || {};
  const set = (field, value) => setData((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  // Merges several fields in one update -- used by "Mark all normal" quick-pick
  // buttons so the whole batch lands as a single state change, not one render
  // per field.
  const setMany = (fields) => setData((prev) => ({ ...prev, [key]: { ...prev[key], ...fields } }));
  return [section, set, setMany];
}

/* ---------- Demographics ---------- */
function DemographicsSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "demographics");
  return (
    <>
      <SectionIntro icon="📋" title="Patient Information" sub="Demographic data — one field at a time, tap through or type." />
      <TextField label="Name" value={d.name} onChange={(v) => set("name", v)} placeholder="Full name" />
      <NumberField label="Age" value={d.age} onChange={(v) => set("age", v)} unit="yrs" />
      <Segmented label="Gender" options={["Male", "Female", "Other"]} value={d.gender} onChange={(v) => set("gender", v)} />
      <TextField label="Address" value={d.address} onChange={(v) => set("address", v)} placeholder="City / locality" />
      <Segmented label="Dominance" options={["Right", "Left"]} value={d.dominance} onChange={(v) => set("dominance", v)} />
      <TextField label="Occupation" value={d.occupation} onChange={(v) => set("occupation", v)} placeholder="e.g. Farmer, office work" />
      <TextField label="Referring doctor" value={d.referrer} onChange={(v) => set("referrer", v)} />
      <SelectField
        label="Source of referral"
        type="single"
        options={["Self", "Physician", "Cardiologist", "Pulmonologist", "Post-surgical team", "Other"]}
        value={d.referralSource}
        onChange={(v) => set("referralSource", v)}
      />
      <TextField label="Diagnosis" value={d.diagnosis} onChange={(v) => set("diagnosis", v)} placeholder="Working / referral diagnosis" />
      <TextField label="Hospital / file number" value={d.hospNo} onChange={(v) => set("hospNo", v)} />
    </>
  );
}

/* ---------- Safety / Red Flags ---------- */
const CHEST_SX = ["No chest discomfort", "Chest pain", "Chest pressure", "Chest tightness", "Chest heaviness", "Pain radiating to arm", "Pain radiating to jaw", "Pain radiating to back"];
const NEURO_SX = ["Dizziness", "Light-headedness", "Presyncope", "Syncope", "Sudden weakness", "New confusion"];
const CARDIAC_SX = ["Palpitations", "Irregular heartbeat sensation", "Unusual fatigue", "Sudden exercise intolerance"];
const BREATHING_SX = ["No dyspnea", "Dyspnea at rest", "Dyspnea on exertion", "Orthopnea", "Paroxysmal nocturnal dyspnea"];
const OTHER_SX = ["Cyanosis", "New/worsening edema", "Sudden deterioration"];

function SafetySection({ data, setData, setting }) {
  const [d, set] = useSectionData(data, setData, "safety");
  const isICU = setting === "icu";
  const flagCount = useMemo(() => {
    const all = [d.chest, d.neuro, d.cardiac, d.breathing, d.other]
      .filter(Boolean)
      .flatMap((s) => String(s).split(", ").filter(Boolean));
    return all.filter((x) => !x.startsWith("No ")).length;
  }, [d.chest, d.neuro, d.cardiac, d.breathing, d.other]);
  return (
    <>
      <SectionIntro icon="🚩" title="Safety Screening" sub="Screen for red flags before proceeding to exertional testing." />
      {flagCount > 0 && <Alert tone="red">⚠️ {flagCount} red-flag item(s) selected — correlate clinically before continuing to exercise / functional testing.</Alert>}
      {isICU && (
        <>
          <SelectField label="Hemodynamic stability" type="single" options={["Stable", "Unstable", "Labile"]} value={d.hemoStability} onChange={(v) => set("hemoStability", v)} />
          <TextField label="Activity restrictions" value={d.activityRestrictions} onChange={(v) => set("activityRestrictions", v)} placeholder="e.g. bed rest only, sitting only, per medical order" />
        </>
      )}
      <SelectField
        label="Chest symptoms"
        type="multi"
        options={CHEST_SX}
        value={d.chest}
        onChange={(v) => set("chest", v)}
        howTo="Pain radiating to the arm, jaw, or back is a classic cardiac ischemia referral pattern — treat as a possible acute coronary event until medically cleared."
      />
      <SelectField
        label="Neurological / circulatory symptoms"
        type="multi"
        options={NEURO_SX}
        value={d.neuro}
        onChange={(v) => set("neuro", v)}
        howTo="Syncope or presyncope may reflect arrhythmia, outflow obstruction (e.g. aortic stenosis), or an orthostatic cause — correlate before any exertional testing."
      />
      <SelectField label="Cardiac symptoms" type="multi" options={CARDIAC_SX} value={d.cardiac} onChange={(v) => set("cardiac", v)} />
      <SelectField
        label="Breathing"
        type="multi"
        options={BREATHING_SX}
        value={d.breathing}
        onChange={(v) => set("breathing", v)}
        howTo="Orthopnea = breathless lying flat, relieved by sitting up. PND (paroxysmal nocturnal dyspnea) = sudden breathlessness that wakes the patient at night. Both suggest left heart failure."
      />
      <SelectField
        label="Other"
        type="multi"
        options={OTHER_SX}
        value={d.other}
        onChange={(v) => set("other", v)}
        howTo="New or worsening edema may reflect fluid overload or right heart failure, especially alongside a raised JVP recorded later in the exam."
      />
    </>
  );
}

/* ---------- Subjective ---------- */
const CHIEF_COMPLAINTS = ["Chest discomfort", "Dyspnea", "Fatigue", "Reduced exercise tolerance", "Palpitations", "Dizziness", "Syncope", "Lower-limb swelling", "Reduced mobility", "Other"];
const ONSETS = ["Sudden", "Gradual", "Insidious", "Post-operative", "After exertion", "At rest"];
const AGGRAVATING = ["Walking", "Stairs", "Exercise", "Emotional stress", "Cold exposure", "Lying flat", "Other"];
const RELIEVING = ["Rest", "Sitting", "Medication", "Position change", "Other"];
const COUGH_TYPES = ["None", "Dry", "Productive", "Weak / ineffective", "Painful"];
const SPUTUM_AMOUNT = ["None", "Scant", "Moderate", "Large"];
const SPUTUM_COLOUR = ["Clear", "White", "Yellow", "Green", "Blood-stained"];
const SPUTUM_CONSISTENCY = ["Thin", "Thick", "Tenacious"];

function SubjectiveSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "subjective");
  return (
    <>
      <SectionIntro icon="📝" title="Subjective Assessment" sub="Start open-ended, then narrow the focus as the interview progresses. Tap any row to fill it in." />
      <SelectField
        label="Chief complaint"
        type="multi"
        options={CHIEF_COMPLAINTS}
        value={d.chiefComplaint}
        onChange={(v) => set("chiefComplaint", v)}
        howTo="Begin with an open question — 'what troubles you most?' — and let the patient lead before narrowing to focused follow-ups."
      />
      <TextArea
        label="History of presenting condition"
        value={d.hpc}
        onChange={(v) => set("hpc", v)}
        placeholder="Onset, triggers, what makes it worse/better, course over time..."
        howTo="Work through OPQRST-style prompts: Onset, Provoking/relieving factors, Quality, Severity (relate to function, not just mild/moderate/severe), Timing/course."
      />
      <SelectField label="Onset" type="single" options={ONSETS} value={d.onset} onChange={(v) => set("onset", v)} />
      <SelectField label="Aggravating factors" type="multi" options={AGGRAVATING} value={d.aggravating} onChange={(v) => set("aggravating", v)} />
      <SelectField label="Relieving factors" type="multi" options={RELIEVING} value={d.relieving} onChange={(v) => set("relieving", v)} />

      <div className="subheading">Cough &amp; sputum</div>
      <SelectField
        label="Cough"
        type="single"
        options={COUGH_TYPES}
        value={d.cough}
        onChange={(v) => set("cough", v)}
        howTo="Cough/sputum questions can feel embarrassing — phrase gently: 'does coughing make you leak urine?', 'does this interfere with your physiotherapy?'"
      />
      <SelectField label="Sputum amount" type="single" options={SPUTUM_AMOUNT} value={d.sputumAmount} onChange={(v) => set("sputumAmount", v)} />
      <SelectField
        label="Sputum colour"
        type="single"
        options={SPUTUM_COLOUR}
        value={d.sputumColour}
        onChange={(v) => set("sputumColour", v)}
        hint={d.sputumColour === "Green" ? "Suggests infection." : d.sputumColour === "Blood-stained" ? "Haemoptysis — ranges from streaks to frank blood; correlate urgently." : undefined}
        howTo="Saliva = clear watery. Mucoid = white/opalescent. Mucopurulent = slightly discoloured. Purulent = thick, yellow/dark green/rusty. Frothy pink/white suggests pulmonary oedema. Black specks suggest smoke/dust exposure."
      />
      <SelectField label="Sputum consistency" type="single" options={SPUTUM_CONSISTENCY} value={d.sputumConsistency} onChange={(v) => set("sputumConsistency", v)} />

      <div className="subheading">History</div>
      <TextArea label="Past medical history" value={d.pmh} onChange={(v) => set("pmh", v)} />
      <TextArea label="Drug history" value={d.drugHx} onChange={(v) => set("drugHx", v)} />
      <TextArea label="Family history" value={d.familyHx} onChange={(v) => set("familyHx", v)} />
      <TextArea label="Social history" value={d.socialHx} onChange={(v) => set("socialHx", v)} placeholder="Smoking, alcohol, living situation, support..." />
      <TextArea
        label="Functional ability"
        value={d.functionalAbility}
        onChange={(v) => set("functionalAbility", v)}
        placeholder="e.g. could climb 5 flights 3 years ago, now stops after 1"
        howTo="Always relate breathlessness to functional change — what the patient could do before vs now — rather than accepting 'mild/moderate/severe' alone."
      />
      <TextArea label="Disease awareness" value={d.diseaseAwareness} onChange={(v) => set("diseaseAwareness", v)} placeholder="Patient's understanding of their condition & treatment" />
    </>
  );
}

/* ---------- Chart / Medical Review ---------- */
const CARDIO_CONDITIONS = ["Hypertension", "Coronary artery disease", "Myocardial infarction", "Heart failure", "Cardiomyopathy", "Arrhythmia", "Atrial fibrillation", "Valvular heart disease", "Peripheral arterial disease", "Congenital heart disease", "Previous cardiac surgery", "Previous angioplasty/stent", "Pacemaker", "ICD"];
const RESP_HISTORY_ACUTE = ["Pneumonia", "COPD exacerbation", "Asthma exacerbation", "ARDS", "Respiratory failure", "Pleural effusion", "Pneumothorax", "Pulmonary edema"];
const RESP_HISTORY_CHRONIC = ["COPD", "Asthma", "Interstitial lung disease (ILD)", "Bronchiectasis", "Previous respiratory infection", "Smoking / occupational exposure", "Other chronic respiratory condition"];
const RISK_FACTORS = ["Diabetes", "Dyslipidemia", "Smoking", "Obesity", "Physical inactivity", "Family history of CVD"];
const MEDICATIONS = ["Beta blocker", "Antiplatelet", "Anticoagulant", "Diuretic", "ACE inhibitor/ARB", "Statin", "Other"];
const MEDICAL_SUPPORT = ["Room air", "Nasal cannula", "Face mask", "HFNC", "NIV", "Mechanical ventilation"];
const LINES_TUBES = ["IV line", "Central line", "Arterial line", "Chest tube", "Urinary catheter", "Feeding tube", "Tracheostomy", "Other"];
const NEURO_STATUS = ["Alert", "Drowsy", "Confused", "Sedated", "Unresponsive"];
const SURGICAL_SITE = ["No concerning symptoms reported", "Pain", "Swelling", "Redness", "Drainage", "Other"];

function ChartSection({ data, setData, setting, system }) {
  const [d, set] = useSectionData(data, setData, "chart");
  const isICU = setting === "icu";
  const isPostOp = setting === "postop";
  const isRehab = setting === "rehab";
  const cardioDetail = system === "cardio" || system === "combined";
  const respDetail = system === "resp" || system === "combined";
  const respHistoryOptions = setting === "outpatient" || isRehab ? RESP_HISTORY_CHRONIC : RESP_HISTORY_ACUTE;

  return (
    <>
      <SectionIntro icon="🗂️" title="Medical / Chart Review" />
      {cardioDetail && <SelectField label="Cardiovascular history" type="multi" options={CARDIO_CONDITIONS} value={d.cardioHx} onChange={(v) => set("cardioHx", v)} />}
      {respDetail && <SelectField label="Respiratory history" type="multi" options={respHistoryOptions} value={d.respHx} onChange={(v) => set("respHx", v)} />}
      <SelectField label="Risk factors" type="multi" options={RISK_FACTORS} value={d.riskFactors} onChange={(v) => set("riskFactors", v)} />
      <SelectField label="Medications" type="multi" options={MEDICATIONS} value={d.medications} onChange={(v) => set("medications", v)} />

      {cardioDetail && (
        <>
          <TextField label="ECG findings" value={d.ecg} onChange={(v) => set("ecg", v)} />
          <TextField label="Echocardiogram findings" value={d.echo} onChange={(v) => set("echo", v)} />
        </>
      )}
      {respDetail && (
        <>
          <TextField label="Chest X-ray findings" value={d.cxr} onChange={(v) => set("cxr", v)} />
          <TextField label="ABG findings" value={d.abg} onChange={(v) => set("abg", v)} />
          <TextField label="Oxygen requirement" value={d.o2Requirement} onChange={(v) => set("o2Requirement", v)} placeholder="e.g. 2L/min NC, room air, BiPAP overnight" />
        </>
      )}

      {isICU && (
        <>
          <div className="subheading">🚨 ICU-specific</div>
          <SelectField label="Medical / respiratory support" type="single" options={MEDICAL_SUPPORT} value={d.support} onChange={(v) => set("support", v)} />
          <SelectField
            label="Lines / tubes"
            type="multi"
            options={LINES_TUBES}
            value={d.linesTubes}
            onChange={(v) => set("linesTubes", v)}
            howTo="Central line disconnection can pull air into the central veins (air embolus) — handle with care. Pacing wire dislodgement can be life-threatening — avoid traction. A chest drain bottle sits ≥0.5m below the chest; fluid should swing with each breath — no swing means the tube isn't patent."
          />
          <SelectField label="Neurological status" type="single" options={NEURO_STATUS} value={d.neuroStatus} onChange={(v) => set("neuroStatus", v)} />
          <TextField label="Hemodynamic information" value={d.hemoInfo} onChange={(v) => set("hemoInfo", v)} placeholder="e.g. inotrope/vasopressor support, CVP" />
          <TextField label="Ventilator parameters" value={d.ventParams} onChange={(v) => set("ventParams", v)} placeholder="Mode, PEEP, FiO2, tidal volume..." />
        </>
      )}

      {isPostOp && (
        <>
          <div className="subheading">🛏️ Post-operative</div>
          <TextField label="Procedure" value={d.procedure} onChange={(v) => set("procedure", v)} />
          <NumberField label="Post-operative day" value={d.postOpDay} onChange={(v) => set("postOpDay", v)} unit="day" />
          <TextField label="Surgical approach" value={d.surgicalApproach} onChange={(v) => set("surgicalApproach", v)} placeholder="e.g. sternotomy, thoracotomy, minimally invasive" />
          <TextField label="Post-operative restrictions" value={d.restrictions} onChange={(v) => set("restrictions", v)} placeholder="e.g. no lifting >5kg, sternal precautions" />
          <SelectField label="Surgical site" type="multi" options={SURGICAL_SITE} value={d.surgicalSite} onChange={(v) => set("surgicalSite", v)} />
        </>
      )}

      {isRehab && (
        <>
          <div className="subheading">🏃 Rehabilitation</div>
          <SelectField label="Previous hospitalization" type="single" options={["None", "1 admission", "2+ admissions"]} value={d.prevHosp} onChange={(v) => set("prevHosp", v)} />
        </>
      )}
    </>
  );
}

/* ---------- Vitals ---------- */
function VitalsSection({ data, setData, system }) {
  const [d, set] = useSectionData(data, setData, "vitals");
  const respDetail = system === "resp" || system === "combined";
  return (
    <>
      <SectionIntro icon="❤️" title="Baseline Physiological Parameters" />
      <div className="vitals-grid">
        <NumberField label="Heart rate" value={d.hr} onChange={(v) => set("hr", v)} unit="bpm" info={cardiovascularData.heartRate} />
        <NumberField label="BP systolic" value={d.bpSys} onChange={(v) => set("bpSys", v)} unit="mmHg" info={cardiovascularData.bloodPressure} />
        <NumberField label="BP diastolic" value={d.bpDia} onChange={(v) => set("bpDia", v)} unit="mmHg" info={cardiovascularData.bloodPressure} />
        <NumberField label="Respiratory rate" value={d.rr} onChange={(v) => set("rr", v)} unit="/min" info={respiratoryData.respRate} />
        <NumberField label="SpO₂" value={d.spo2} onChange={(v) => set("spo2", v)} unit="%" info={respiratoryData.spo2} />
        <NumberField label="Temperature" value={d.temp} onChange={(v) => set("temp", v)} unit="°C" />
        {respDetail && <NumberField label="Oxygen flow" value={d.o2Flow} onChange={(v) => set("o2Flow", v)} unit="L/min" />}
        {respDetail && <NumberField label="FiO₂" value={d.fio2} onChange={(v) => set("fio2", v)} unit="%" />}
      </div>
      <SelectField label="Rhythm" type="single" options={["Regular", "Irregular", "Known arrhythmia", "Unknown/not assessed"]} value={d.rhythm} onChange={(v) => set("rhythm", v)} info={cardiovascularData.pulseRhythm} />
      <Segmented label="Position during measurement" options={["Supine", "Sitting", "Standing"]} value={d.position} onChange={(v) => set("position", v)} />
    </>
  );
}

/* ---------- Cardiovascular Examination ---------- */
function CardioSection({ data, setData, system }) {
  const [d, set, setMany] = useSectionData(data, setData, "cardio");
  const detailed = system === "cardio" || system === "combined";
  // "Quick Normal" -- most patients most of the time have an unremarkable
  // cardiovascular exam; a real therapist scans for red flags and moves on
  // rather than opening all 10+ fields to confirm each is normal one at a
  // time. One tap fills the whole normal/negative baseline (collapsed rows
  // immediately show it as their summary chip); anything actually abnormal
  // still gets tapped open and overridden individually.
  function markAllNormal() {
    const normal = { generalObs: "No distress", skinColour: "Normal", temperature: "Warm", edema: "None" };
    if (detailed) {
      normal.hands = "None";
      normal.clubbing = "Absent";
      normal.cyanosis = "None";
      normal.heartSounds = "S1 normal, S2 normal";
    }
    const pulses = {};
    ["Radial", "Dorsalis pedis", "Posterior tibial"].forEach((r) => ["Right", "Left"].forEach((c) => { pulses[`${r}__${c}`] = "Present"; }));
    normal.pulses = pulses;
    setMany(normal);
  }
  return (
    <>
      <SectionIntro icon="🫀" title="Cardiovascular Examination" sub={(detailed ? "" : "Respiratory pathway — screening level only. ") + "Tap any row to fill it in."} />

      <button type="button" className="quick-normal-btn" onClick={markAllNormal}>
        ✓ Mark all normal
      </button>

      <SelectField
        label="General observation"
        type="multi"
        options={["No distress", "Short of breath", "Sitting on edge of bed", "Visibly distressed", "Cyanosed", "On supplemental oxygen", "Distressed on movement/undressing"]}
        value={d.generalObs}
        onChange={(v) => set("generalObs", v)}
        howTo="Observe before touching the patient: short of breath, sitting forward, cyanosed, on oxygen (how much), speech pattern — full sentences, broken phrases, or too breathless to speak?"
      />

      {detailed && (
        <>
          <SelectField
            label="Hands / tremor"
            type="single"
            options={["None", "Fine tremor (bronchodilators)", "Coarse flap (CO2 retention)", "Muscle wasting (Pancoast)", "Nicotine staining"]}
            value={d.hands}
            onChange={(v) => set("hands", v)}
          />
          <SelectField
            label="Clubbing"
            type="single"
            options={["Absent", "Early — loss of nail-bed angle", "Established — enlarged finger pad", "Spongy nail bed"]}
            value={d.clubbing}
            onChange={(v) => set("clubbing", v)}
            info={cardiovascularData.clubbing}
          />
          <SelectField
            label="Cyanosis"
            type="single"
            options={["None", "Peripheral", "Central"]}
            value={d.cyanosis}
            onChange={(v) => set("cyanosis", v)}
            info={respiratoryData.cyanosis}
          />
          <NumberField
            label="Jugular venous pressure (JVP)"
            value={d.jvp}
            onChange={(v) => set("jvp", v)}
            unit="cm above sternal angle"
            info={cardiovascularData.jvp}
          />
        </>
      )}

      <div className="subheading">Peripheral perfusion</div>
      <SelectField label="Skin colour" type="single" options={["Normal", "Pale", "Cyanotic", "Mottled"]} value={d.skinColour} onChange={(v) => set("skinColour", v)} info={cardiovascularData.skinColour} />
      <SelectField label="Temperature" type="single" options={["Warm", "Cool", "Unequal"]} value={d.temperature} onChange={(v) => set("temperature", v)} info={cardiovascularData.skinTemperature} />
      <NumberField
        label="Capillary refill"
        value={d.capRefill}
        onChange={(v) => set("capRefill", v)}
        unit="sec"
        info={cardiovascularData.capRefill}
      />

      <LRGrid
        label="Peripheral pulses"
        rows={["Radial", "Dorsalis pedis", "Posterior tibial"]}
        options={["Present", "Reduced", "Absent", "Irregular"]}
        value={d.pulses || {}}
        onChange={(v) => set("pulses", v)}
        info={cardiovascularData.pulses}
      />

      <SelectField label="Edema" type="single" options={["None", "Mild", "Moderate", "Severe"]} value={d.edema} onChange={(v) => set("edema", v)}
        info={cardiovascularData.edema}
      />
      {d.edema && d.edema !== "None" && (
        <SelectField label="Pitting or non-pitting" type="single" options={["Pitting", "Non-pitting"]} value={d.edemaType} onChange={(v) => set("edemaType", v)} />
      )}
      {d.edemaType === "Pitting" && (
        <SelectField
          label="Pitting grade"
          type="single"
          options={["1+ Trace — barely detectable, resolves almost immediately", "2+ Mild — pit resolves within ~15 seconds", "3+ Moderate — pit resolves within ~30 seconds", "4+ Severe — deep pit lasting >30 seconds"]}
          value={d.edemaGrade}
          onChange={(v) => set("edemaGrade", v)}
          info={cardiovascularData.edema}
        />
      )}
      <SelectField label="Edema location" type="multi" options={["Right ankle", "Left ankle", "Bilateral ankle", "Lower leg", "Generalized", "Sacral"]} value={d.edemaLocation} onChange={(v) => set("edemaLocation", v)} />

      {detailed && (
        <>
          <div className="subheading">Auscultation — heart sounds</div>
          <SelectField
            label="Sounds heard"
            type="multi"
            options={["S1 normal", "S2 normal", "S3 present", "S4 present", "Murmur present"]}
            value={d.heartSounds}
            onChange={(v) => set("heartSounds", v)}
            info={cardiovascularData.cardiacAuscultation}
          />
          {String(d.heartSounds || "").includes("Murmur present") && (
            <TextArea label="Murmur description" value={d.murmurDesc} onChange={(v) => set("murmurDesc", v)} placeholder="Timing, location, character..." info={cardiovascularData.murmurs} />
          )}
        </>
      )}
    </>
  );
}

/* ---------- Respiratory Examination ---------- */
function RespSection({ data, setData, system }) {
  const [d, set] = useSectionData(data, setData, "resp");
  const detailed = system === "resp" || system === "combined";
  return (
    <>
      <SectionIntro icon="🫁" title="Respiratory Examination" sub={detailed ? undefined : "Cardiovascular pathway — screening level only."} />

      <SelectField label="Breathing pattern" type="single" options={["Normal", "Tachypnea", "Bradypnea", "Laboured", "Shallow", "Irregular"]} value={d.pattern} onChange={(v) => set("pattern", v)} info={respiratoryData.respRate} />

      {detailed && (
        <>
          <SelectField label="Breathing pattern type" type="single" options={["Diaphragmatic", "Upper chest", "Thoracoabdominal", "Paradoxical"]} value={d.patternType} onChange={(v) => set("patternType", v)} info={respiratoryData.breathingPattern} />
          <SelectField
            label="Chest shape"
            type="single"
            options={["Normal", "Barrel chest", "Pectus excavatum", "Pectus carinatum", "Kyphoscoliosis", "Other"]}
            value={d.chestShape}
            onChange={(v) => set("chestShape", v)}
            info={respiratoryData.chestShape}
          />
          <SelectField label="Accessory muscle use" type="single" options={["None", "Mild", "Moderate", "Severe"]} value={d.accessory} onChange={(v) => set("accessory", v)} info={respiratoryData.workOfBreathing} />
          <SelectField
            label="Chest expansion"
            type="single"
            options={["Symmetrical", "Reduced right", "Reduced left", "Globally reduced"]}
            value={d.expansion}
            onChange={(v) => set("expansion", v)}
            info={respiratoryData.chestExpansion}
          />
          <div className="subheading">Palpation</div>
          <SelectField
            label="Trachea"
            type="single"
            options={["Central", "Deviated"]}
            value={d.trachea}
            onChange={(v) => set("trachea", v)}
            info={respiratoryData.trachea}
          />
          <SelectField
            label="Vocal fremitus"
            type="single"
            options={["Normal", "Increased", "Decreased"]}
            value={d.fremitus}
            onChange={(v) => set("fremitus", v)}
            info={respiratoryData.fremitus}
          />

          <LRGrid
            label="Percussion"
            rows={["Upper", "Middle", "Lower"]}
            options={["Resonant", "Dull", "Stony dull", "Hyperresonant"]}
            value={d.percussion || {}}
            onChange={(v) => set("percussion", v)}
            howTo="Left middle finger flat on the chest, strike its middle joint with the right middle fingertip, relaxed wrist. Compare side to side, top to bottom. Resonant = normal. Dull = consolidation. Stony dull = effusion. Hyperresonant = pneumothorax."
          />
        </>
      )}

      <LRGrid
        label="Auscultation"
        rows={["Upper", "Middle", "Lower"]}
        options={["Normal", "Reduced", "Crackles", "Wheeze", "Rhonchi", "Bronchial"]}
        value={d.auscultation || {}}
        onChange={(v) => set("auscultation", v)}
        info={respiratoryData.breathSounds}
      />

      <div className="subheading">Dyspnea (Borg scale)</div>
      <ScaleField label="At rest" value={d.dyspneaRest} onChange={(v) => set("dyspneaRest", v)} info={respiratoryData.borg} />
      <ScaleField label="On activity" value={d.dyspneaActivity} onChange={(v) => set("dyspneaActivity", v)} info={respiratoryData.borg} />
    </>
  );
}

/* ---------- Functional Capacity ---------- */
function FunctionalSection({ data, setData, setting }) {
  const [d, set] = useSectionData(data, setData, "functional");
  const isICU = setting === "icu";
  return (
    <>
      <SectionIntro icon="🚶" title="Functional Capacity" />
      {isICU ? (
        <SelectField label="Mobility level" type="single" options={["Bed-bound", "Bed mobility", "Sitting", "Standing", "Transfer", "Walking"]} value={d.mobility} onChange={(v) => set("mobility", v)} />
      ) : (
        <SelectField
          label="Mobility"
          type="single"
          options={["Independent", "Supervision", "Minimal assistance", "Moderate assistance", "Maximum assistance", "Dependent"]}
          value={d.mobility}
          onChange={(v) => set("mobility", v)}
        />
      )}
      <SelectField label="Walking" type="single" options={["Independent", "Walking aid", "Assistance required", "Unable to walk"]} value={d.walking} onChange={(v) => set("walking", v)} />
      <SelectField label="Activity tolerance" type="single" options={["Good", "Fair", "Poor"]} value={d.tolerance} onChange={(v) => set("tolerance", v)} />
      <SelectField
        label="Functional tests selected"
        type="multi"
        options={["6-Minute Walk Test", "2-Minute Walk Test", "5× Sit-to-Stand", "Timed Up and Go", "Shuttle Walk Test", "Step test", "Other"]}
        value={d.tests}
        onChange={(v) => set("tests", v)}
        howTo="6MWT: flat corridor, patient's own pace, 6 minutes, record distance + SpO2/HR/Borg before and after. TUG: mobility/falls risk. Shuttle walk: 9m course, pace set by beeps."
      />
    </>
  );
}

/* ---------- Exercise Response ---------- */
function ExerciseSection({ data, setData, setting }) {
  const [d, set] = useSectionData(data, setData, "exercise");
  const isRehab = setting === "rehab";
  return (
    <>
      <SectionIntro icon="🏃" title="Exercise / Activity Response" sub={isRehab ? "Rehabilitation pathway — record every stage closely." : undefined} />

      {isRehab && (
        <>
          <div className="subheading">Exercise assessment</div>
          <SelectField
            label="Exercise mode"
            type="single"
            options={["Treadmill", "Cycle ergometer", "Overground walking", "Arm ergometer", "Combined / circuit", "Other"]}
            value={d.mode}
            onChange={(v) => set("mode", v)}
          />
          <NumberField label="Duration" value={d.duration} onChange={(v) => set("duration", v)} unit="min" />
          <SelectField
            label="Intensity"
            type="single"
            options={["Low", "Moderate", "High", "Target HR zone-based", "RPE-based"]}
            value={d.intensity}
            onChange={(v) => set("intensity", v)}
          />
          <TextField label="Frequency" value={d.frequency} onChange={(v) => set("frequency", v)} placeholder="e.g. 3x/week" />
          <TextField label="Oxygen requirement" value={d.exO2} onChange={(v) => set("exO2", v)} placeholder="L/min if applicable" />
        </>
      )}

      <div className="subheading">Pre-exercise</div>
      <div className="vitals-grid">
        <NumberField label="HR" value={d.preHR} onChange={(v) => set("preHR", v)} unit="bpm" width="30%" info={cardiovascularData.heartRate} />
        <NumberField label="BP sys" value={d.preBPs} onChange={(v) => set("preBPs", v)} unit="mmHg" width="30%" info={cardiovascularData.bloodPressure} />
        <NumberField label="SpO₂" value={d.preSpO2} onChange={(v) => set("preSpO2", v)} unit="%" width="30%" info={respiratoryData.spo2} />
      </div>
      <ScaleField
        label="Borg RPE (pre)"
        value={d.preRPE}
        onChange={(v) => set("preRPE", v)}
        info={cardiovascularData.borgRPE}
      />
      <ScaleField label="Borg dyspnea (pre)" value={d.preDyspnea} onChange={(v) => set("preDyspnea", v)} info={respiratoryData.borg} />

      <div className="subheading">During / peak</div>
      <div className="vitals-grid">
        <NumberField label="HR" value={d.duringHR} onChange={(v) => set("duringHR", v)} unit="bpm" width="30%" info={cardiovascularData.heartRate} />
        <NumberField label="BP sys" value={d.duringBPs} onChange={(v) => set("duringBPs", v)} unit="mmHg" width="30%" info={cardiovascularData.bloodPressure} />
        <NumberField label="SpO₂" value={d.duringSpO2} onChange={(v) => set("duringSpO2", v)} unit="%" width="30%" info={respiratoryData.spo2} />
      </div>
      <ScaleField label="Borg RPE (during)" value={d.duringRPE} onChange={(v) => set("duringRPE", v)} info={cardiovascularData.borgRPE} />
      <ScaleField label="Borg dyspnea (during)" value={d.duringDyspnea} onChange={(v) => set("duringDyspnea", v)} info={respiratoryData.borg} />
      <SelectField
        label="Symptoms during activity"
        type="multi"
        options={["No symptoms", "Chest discomfort", "Dyspnea", "Dizziness", "Palpitations", "Excessive fatigue", "Leg discomfort", "Desaturation", "Other"]}
        value={d.symptoms}
        onChange={(v) => set("symptoms", v)}
      />

      <div className="subheading">Recovery</div>
      <div className="vitals-grid">
        <NumberField label="HR" value={d.postHR} onChange={(v) => set("postHR", v)} unit="bpm" width="30%" info={cardiovascularData.hrRecovery} />
        <NumberField label="SpO₂" value={d.postSpO2} onChange={(v) => set("postSpO2", v)} unit="%" width="30%" info={respiratoryData.spo2} />
      </div>
      <SelectField label="Recovery pattern" type="single" options={["Rapid recovery", "Delayed recovery", "Persistent symptoms"]} value={d.recovery} onChange={(v) => set("recovery", v)} info={cardiovascularData.hrRecovery} />

      <div className="subheading">6MWT / exercise test</div>
      <NumberField label="Distance" value={d.distance} onChange={(v) => set("distance", v)} unit="m" info={cardiovascularData.sixMWT} />
      <SelectField
        label="Reason for stopping"
        type="single"
        options={["Completed", "Dyspnea", "Fatigue", "Chest discomfort", "Dizziness", "Desaturation", "Other"]}
        value={d.stopReason}
        onChange={(v) => set("stopReason", v)}
        info={cardiovascularData.sixMWT}
      />
    </>
  );
}

/* ---------- Outcome Measures ---------- */
const NYHA = [
  { g: "I", d: "No limitation of physical activity. Ordinary activity does not cause undue fatigue, palpitation, or dyspnea." },
  { g: "II", d: "Slight limitation. Comfortable at rest; ordinary activity results in fatigue, palpitation, or dyspnea." },
  { g: "III", d: "Marked limitation. Comfortable at rest; less than ordinary activity causes symptoms." },
  { g: "IV", d: "Unable to carry out any physical activity without discomfort; symptoms may be present at rest." },
];
const MMRC = ["Grade 0", "Grade 1", "Grade 2", "Grade 3", "Grade 4"];

function OutcomesSection({ data, setData, setting, system }) {
  const [d, set] = useSectionData(data, setData, "outcomes");
  const cardioDetail = system === "cardio" || system === "combined";
  const respDetail = system === "resp" || system === "combined";
  const isICU = setting === "icu";
  return (
    <>
      <SectionIntro icon="📊" title="Outcome Measures" />
      {isICU && (
        <>
          <SelectField
            label="Mobility level achieved"
            type="single"
            options={["Bed-bound", "Bed mobility", "Sitting", "Standing", "Transfer", "Walking"]}
            value={d.mobilityAchieved}
            onChange={(v) => set("mobilityAchieved", v)}
          />
          <SelectField label="Sitting / standing tolerance" type="single" options={["Good", "Fair", "Poor", "Not assessed"]} value={d.sitStandTolerance} onChange={(v) => set("sitStandTolerance", v)} />
        </>
      )}
      {cardioDetail && (
        <SelectField
          label="NYHA class"
          type="single"
          options={NYHA.map((n) => n.g)}
          value={d.nyha}
          onChange={(v) => set("nyha", v)}
          hint={d.nyha ? NYHA.find((n) => n.g === d.nyha)?.d : "Tap a class to see its definition."}
          info={cardiovascularData.nyha}
        />
      )}
      {respDetail && (
        <>
          <SelectField
            label="mMRC dyspnea grade"
            type="single"
            options={MMRC}
            value={d.mmrc}
            onChange={(v) => set("mmrc", v)}
            info={respiratoryData.mmrc}
          />
          <NumberField label="CAT score" value={d.cat} onChange={(v) => set("cat", v)} unit="/40" />
        </>
      )}
      <NumberField label="6MWT distance" value={d.sixMWT} onChange={(v) => set("sixMWT", v)} unit="m" info={cardiovascularData.sixMWT} />
      <ScaleField label="Overall Borg dyspnea" value={d.borg} onChange={(v) => set("borg", v)} info={respiratoryData.borg} />
      {setting === "rehab" && (
        <TextField label="Exercise tolerance / symptom measure" value={d.exerciseToleranceMeasure} onChange={(v) => set("exerciseToleranceMeasure", v)} />
      )}
      <TextArea label="Other outcome measures" value={d.other} onChange={(v) => set("other", v)} placeholder="e.g. quality-of-life questionnaire scores" />
    </>
  );
}

/* ---------- Clinical Interpretation ---------- */
function InterpretationSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "interpretation");

  const flags = useMemo(() => {
    const out = [];
    const safety = data.safety || {};
    const cardio = data.cardio || {};
    const breathing = String(safety.breathing || "");
    if (breathing.includes("Orthopnea") && breathing.includes("Paroxysmal nocturnal dyspnea") && (cardio.edema === "Moderate" || cardio.edema === "Severe")) {
      out.push({ tone: "red", text: "Orthopnea + PND + significant edema — pattern consistent with possible heart failure. Correlate clinically / with medical team." });
    }
    if (String(safety.chest || "").includes("radiating")) {
      out.push({ tone: "red", text: "Radiating chest pain reported — rule out acute cardiac event before continuing exertional assessment." });
    }
    if (cardio.jvp && Number(cardio.jvp) > 4) {
      out.push({ tone: "amber", text: "Raised JVP recorded — consider right heart failure / fluid overload." });
    }
    return out;
  }, [data]);

  return (
    <>
      <SectionIntro icon="🧠" title="Clinical Interpretation" sub="Synthesize subjective + objective findings into a problem list." />
      {flags.map((f, i) => (
        <Alert tone={f.tone} key={i}>
          {f.text}
        </Alert>
      ))}
      {flags.length === 0 && <Alert tone="green">No automatic pattern flags triggered from entries so far.</Alert>}
      <TextArea
        label="Problem list"
        value={d.problems}
        onChange={(v) => set("problems", v)}
        placeholder="List the patient's key problems in priority order..."
        howTo="Correlate symptoms with signs (e.g. dyspnea + crackles + reduced expansion) before forming a working impression. The flags above are rule-based prompts, not a diagnosis — always correlate clinically."
      />
      <TextArea label="Short-term goals" value={d.shortGoals} onChange={(v) => set("shortGoals", v)} />
      <TextArea label="Long-term goals" value={d.longGoals} onChange={(v) => set("longGoals", v)} />
      <TextArea label="Clinical impression" value={d.impression} onChange={(v) => set("impression", v)} />
    </>
  );
}

/* ---------- Precautions ---------- */
function PrecautionsSection({ data, setData, setting, system }) {
  const [d, set] = useSectionData(data, setData, "precautions");
  const base = ["Monitor HR/BP/SpO₂ during activity", "Avoid Valsalva manoeuvre", "Stop if chest pain, dizziness, or desaturation"];
  const rehabBySystem = {
    cardio: ["Stay within prescribed target HR zone", "Warm-up / cool-down mandatory", "Risk-factor education"],
    resp: ["Titrate supplemental oxygen per protocol", "Cue pursed-lip breathing during exertion", "Watch for desaturation"],
    combined: ["Cardiac + respiratory monitoring", "Titrate oxygen per protocol", "Modify exercise intensity as needed", "Clear stop criteria for escalation"],
  };
  const bySetting = {
    icu: ["Line/tube precautions", "Coordinate mobilisation with ventilator settings", "Two-person assist if sedated/drowsy"],
    postop: ["Sternal precautions if cardiac surgery", "Wound/dressing precautions", "Avoid excessive shoulder loading if applicable"],
    rehab: rehabBySystem[system] || [],
  };
  const options = [...base, ...(bySetting[setting] || [])];
  return (
    <>
      <SectionIntro icon="⚠️" title="Treatment Precautions" />
      <SelectField label="Precautions" type="multi" options={options} value={d.selected} onChange={(v) => set("selected", v)} />
      <TextArea label="Additional precautions" value={d.additional} onChange={(v) => set("additional", v)} />
    </>
  );
}

/* ---------- Summary ---------- */
function fmtVal(v) {
  if (v && typeof v === "object") {
    const entries = Object.entries(v).filter(([, val]) => val);
    return entries.length ? entries.map(([k, val]) => `${k.replace("__", " ")}: ${val}`).join(" · ") : null;
  }
  if (v === undefined || v === null || v === "") return null;
  return String(v);
}

// Exported (2026-08-20, Aditi: "assessment should show like this image...
// i command you put summary and review same to same not change at all in
// assessment section") so SpecialtyPatientProfile.jsx's Assessments tab can
// render the EXACT same summary component the wizard's own last step uses,
// instead of a separately-built generic renderer (AssessmentReportView.jsx)
// that dumped raw internal fields like `meta` as if they were clinical
// content. buildCardioAssessSteps mirrors the assessSteps useMemo below so
// the profile view sees the same section list/labels/icons the wizard did.
export function buildCardioAssessSteps(stepOrder, customStepsMeta = {}) {
  const order = stepOrder || ASSESS_STEPS.map((s) => s.id);
  return order.map((id) => STEP_META.find((s) => s.id === id) || { id, icon: customStepsMeta[id]?.icon || "🩺", label: customStepsMeta[id]?.label || "Assessment" });
}
// The CSS classes SummarySection/SectionIntro/primary-btn depend on
// normally come from the big <style> block inside the default-exported
// wizard component (below) -- not present when SummarySection is embedded
// standalone in SpecialtyPatientProfile.jsx. Exported so that screen can
// render it once alongside SummarySection, verbatim copy of the same rules
// so the profile view is pixel-identical to the wizard's own last step.
export function SummaryStyles() {
  return (
    <style>{`
      .section-intro { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 18px; }
      .section-intro-icon { font-size: 26px; line-height: 1; }
      .section-intro-title { font-weight: 800; font-size: 19px; letter-spacing: -0.01em; }
      .section-intro-sub { font-size: 13px; color: ${BRAND.gray}; margin-top: 2px; }
      .summary-card { border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 12px 14px; margin-bottom: 12px; }
      .summary-title { font-weight: 700; font-size: 13px; color: ${BRAND.purpleDark}; margin-bottom: 8px; }
      .summary-row { display: flex; gap: 8px; font-size: 12.5px; padding: 3px 0; border-top: 1px solid #F5F3FB; }
      .summary-row:first-child { border-top: none; }
      .summary-key { flex: 0 0 42%; color: ${BRAND.gray}; text-transform: capitalize; }
      .summary-val { flex: 1; font-weight: 500; word-break: break-word; }
      .primary-btn {
        flex: 1; border: none; background: linear-gradient(90deg, ${BRAND.purple}, ${BRAND.purpleDark}); color: #fff;
        padding: 14px 18px; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer;
        box-shadow: 0 6px 16px rgba(108,77,255,.28); position: relative; overflow: hidden;
        transition: transform .1s ease-out, box-shadow .1s ease-out, filter .1s ease-out;
      }
      /* Real press feedback -- depress + flatten shadow + slight darken (ripple itself comes from rippleEffect.js, injected via JS since .primary-btn is duplicated across several independently-loaded modules rather than one shared stylesheet). */
      .primary-btn:active { transform: scale(.97); box-shadow: 0 2px 6px rgba(108,77,255,.22); filter: brightness(.96); }
      .ai-treatment-cta { width: 100%; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; border: 1.5px solid ${BRAND.purple}; border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; background: linear-gradient(135deg, ${BRAND.purpleFaint}, #fff 70%); cursor: pointer; text-align: left; font-family: inherit; }
      .ai-treatment-cta-title { font-weight: 800; font-size: 14px; color: ${BRAND.purpleDark}; }
      .ai-treatment-cta-sub { font-size: 11.5px; color: ${BRAND.gray}; }
    `}</style>
  );
}
export function SummarySection({ setting, system, data, setData, assessSteps }) {
  const settingLabel = SETTINGS.find((s) => s.id === setting)?.label || "—";
  const systemLabel = setting === "rehab" && system ? rehabSubLabel(system) : SYSTEMS.find((s) => s.id === system)?.label || "—";
  const [copied, setCopied] = useState(false);
  // Treatment Assistant only makes sense once setData is actually wired in
  // (the real final Summary step) -- the mid-assessment "Review So Far"
  // modal reuses this same component read-only and doesn't pass setData,
  // so it never shows the button.
  const [showTreatment, setShowTreatment] = useState(false);
  const steps = assessSteps || ASSESS_STEPS;

  // exportText must be computed unconditionally -- every hook in this
  // component has to run on every render regardless of showTreatment, or
  // React throws "rendered fewer hooks than expected" the moment the early
  // return below starts skipping it.
  const exportText = useMemo(() => {
    let lines = [`CARDIOPULMONARY ASSESSMENT`, `Setting: ${settingLabel}   Pathway: ${systemLabel}`, ""];
    steps.filter((s) => s.id !== "summary").forEach((step) => {
      const section = data[step.id] || {};
      const rows = Object.entries(section)
        .map(([k, v]) => [k, fmtVal(v)])
        .filter(([, v]) => v);
      if (rows.length) {
        lines.push(`— ${step.label} —`);
        rows.forEach(([k, v]) => lines.push(`${k}: ${v}`));
        lines.push("");
      }
    });
    return lines.join("\n");
  }, [data, settingLabel, systemLabel, steps]);

  if (showTreatment) {
    return <CardioTreatmentAssistant data={data} setData={setData} setting={setting} onClose={() => setShowTreatment(false)} />;
  }

  return (
    <>
      <SectionIntro icon="✅" title="Summary & Review" sub={`${settingLabel} · ${systemLabel}`} />
      {steps.filter((s) => s.id !== "summary").map((step) => {
        const section = data[step.id] || {};
        const rows = Object.entries(section)
          .map(([k, v]) => [k, fmtVal(v)])
          .filter(([, v]) => v);
        if (!rows.length) return null;
        return (
          <div className="summary-card" key={step.id}>
            <div className="summary-title">
              {step.icon} {step.label}
            </div>
            {rows.map(([k, v]) => (
              <div className="summary-row" key={k}>
                <span className="summary-key">{k}</span>
                <span className="summary-val">{v}</span>
              </div>
            ))}
          </div>
        );
      })}
      {setData && (
        <button
          type="button"
          className="ai-treatment-cta"
          onClick={() => setShowTreatment(true)}
        >
          <span className="ai-treatment-cta-title">✨ AI Treatment Assistant</span>
          <span className="ai-treatment-cta-sub">Based on your documented findings</span>
        </button>
      )}
      <button
        type="button"
        className="primary-btn"
        style={{ marginTop: 12 }}
        onClick={() => {
          navigator.clipboard?.writeText(exportText);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? "Copied ✓" : "Copy assessment as text"}
      </button>
    </>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
// Bug fix (2026-08-19, Aditi's request): this component used to take no
// props at all and hold everything in its own local useState -- nothing
// it did ever reached the real patient record (AppFull.jsx's `patients`
// state / localStorage / Supabase), so a "completed" cardio assessment
// vanished the moment you navigated away. Every other module (Subjective,
// Objective, etc.) is handed `data`/`set` from AppFull.jsx and writes
// through them instead; AppFull.jsx's own autosave effects watch that
// shared `data` object and persist it whenever it changes -- no separate
// save path needed here, just plugging into the existing one.
//
// `patientData`/`onSave` mirror that pattern one level up: rather than
// flattening every internal cardio field into the shared bag (this file
// has its own deeply nested step/section data model, not worth
// rewriting), the whole local `data` object is stored under one
// `patientData.cardio` key via `onSave("cardio", data)` -- same shape
// AppFull.jsx already uses for e.g. `set("dem_age", value)`, just with
// an object value instead of a string.
//
// `activePatientId` is used only to know WHEN to re-hydrate from the
// current patient's saved cardio data (switching patients) -- see the
// effect below, which mirrors AppFull.jsx's own selectPatient()
// re-hydration for every other module.
export default function CardiopulmonaryAssessment({ patientData, activePatientId, onSave, onNav } = {}) {
  // Lock the page from pinch-zoom and from iOS's auto-zoom-on-input-focus,
  // which is what causes the "whole page jumps/zooms while filling" feeling
  // on mobile (2026-08-20, Aditi). Mirrors NeurologicalAssessment.jsx's own
  // effect -- this file was missing it entirely.
  useEffect(() => {
    let tag = document.querySelector('meta[name="viewport"]');
    const created = !tag;
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "viewport";
      document.head.appendChild(tag);
    }
    const prevContent = tag.getAttribute("content");
    tag.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
    return () => {
      if (created) tag.remove();
      else if (prevContent) tag.setAttribute("content", prevContent);
    };
  }, []);

  // Editing an existing assessment (2026-08-20, Aditi: "clicking on edit
  // assessment take us to same as new assessment...it should take us to
  // directly demographic data of that template") -- Setting/System (step 0/1)
  // are a one-time template picker, not something worth re-asking every time
  // a therapist reopens a patient with data already on file. If there's
  // existing cardio data, skip straight to Patient Information (step 2)
  // using the setting/system saved with it (data.meta), defaulting to
  // Outpatient/Combined for records saved before data.meta existed.
  const seed = patientData?.cardio || {};
  const hasExisting = Object.keys(seed).length > 0;
  const [step, setStep] = useState(() => (hasExisting ? 2 : 0));
  const [setting, setSetting] = useState(() => (hasExisting ? seed.meta?.setting || "outpatient" : null));
  const [system, setSystem] = useState(() => (hasExisting ? seed.meta?.system || "combined" : null));
  const [data, setData] = useState(() => seed);
  const [visited, setVisited] = useState(new Set());
  const [stepOrder, setStepOrder] = useState(() => (hasExisting ? seed.meta?.stepOrder || ASSESS_STEPS.map((s) => s.id) : ASSESS_STEPS.map((s) => s.id)));
  const [customStepsMeta, setCustomStepsMeta] = useState(() => (hasExisting ? seed.meta?.customStepsMeta || {} : {}));
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(null);

  // Re-hydrate when switching to a different patient -- deliberately keyed
  // on activePatientId only (not on every patientData change), otherwise
  // this would fight with the push-up effect below and reset mid-typing.
  useEffect(() => {
    const s = patientData?.cardio || {};
    const existing = Object.keys(s).length > 0;
    setData(s);
    setStep(existing ? 2 : 0);
    setSetting(existing ? s.meta?.setting || "outpatient" : null);
    setSystem(existing ? s.meta?.system || "combined" : null);
    setVisited(new Set());
    setStepOrder(existing ? s.meta?.stepOrder || ASSESS_STEPS.map((s) => s.id) : ASSESS_STEPS.map((s) => s.id));
    setCustomStepsMeta(existing ? s.meta?.customStepsMeta || {} : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePatientId]);

  // The actual save: every local change gets pushed into the patient's
  // real record via the same `set()` AppFull.jsx hands every other module.
  useEffect(() => {
    onSave?.("cardio", data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Remember the chosen setting/system/stepOrder/customStepsMeta template
  // on the record itself so re-opening this patient later (see hasExisting
  // above) can skip the picker and keep any added custom steps instead of
  // asking again / silently dropping them.
  useEffect(() => {
    if (!setting && !system) return;
    setData((prev) => {
      const meta = { setting, system, stepOrder, customStepsMeta };
      const p = prev.meta;
      if (p && p.setting === meta.setting && p.system === meta.system && p.stepOrder === meta.stepOrder && p.customStepsMeta === meta.customStepsMeta) return prev;
      return { ...prev, meta };
    });
    // Also mirror the chosen setting onto the shared patient record's own
    // top-level care_setting field (2026-08-31) -- PatientDatabase.jsx's
    // IPD/Outpatient/Post-op filter pills read that field directly; without
    // this, picking "Inpatient" here never showed up as IPD in the patient
    // list at all.
    if (setting) {
      const careSetting = setting === "postop" ? "postop" : (setting === "inpatient" || setting === "icu") ? "ipd" : "outpatient";
      onSave?.("care_setting", careSetting);
    }
  }, [setting, system, stepOrder, customStepsMeta]);

  // One shared patient identity, not two separate ones (Aditi's request:
  // "use the profile of patient of ortho ... make profile of patient").
  // Seeds this screen's Patient Information step from the SAME dem_*
  // fields Ortho's own Demographics module reads/writes (confirmed exact
  // key names in ClinicalModules.jsx/AppFull.jsx: dem_name, dem_age,
  // dem_sex/dem_gender, dem_address, dem_occupation, dem_referral_dr,
  // dem_dominant) whenever this screen's own fields are still blank, and
  // mirrors edits made HERE back into those same keys -- so switching to
  // Ortho for the same patient sees whatever was typed in Cardio and vice
  // versa, instead of two disconnected demographic forms for one patient.
  useEffect(() => {
    const dem = patientData || {};
    const cardioDem = data.demographics || {};
    const seeded = {
      name: cardioDem.name || dem.dem_name || "",
      age: cardioDem.age || dem.dem_age || "",
      gender: cardioDem.gender || dem.dem_sex || dem.dem_gender || "",
      address: cardioDem.address || dem.dem_address || "",
      occupation: cardioDem.occupation || dem.dem_occupation || "",
      referrer: cardioDem.referrer || dem.dem_referral_dr || dem.dem_gp || "",
      dominance: cardioDem.dominance || dem.dem_dominant || dem.dem_dominant_hand || dem.dem_hand || "",
    };
    const changed = Object.keys(seeded).some((k) => seeded[k] !== (cardioDem[k] || ""));
    if (changed) setData((prev) => ({ ...prev, demographics: { ...prev.demographics, ...seeded } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePatientId]);

  // Mirror edits made in THIS screen's Patient Information step back into
  // the shared dem_* keys, so Ortho sees them too -- same "one profile"
  // reasoning as the seeding effect above, other direction.
  useEffect(() => {
    const cardioDem = data.demographics;
    if (!cardioDem || !onSave) return;
    if (cardioDem.name) onSave("dem_name", cardioDem.name);
    if (cardioDem.age) onSave("dem_age", cardioDem.age);
    if (cardioDem.gender) { onSave("dem_sex", cardioDem.gender); onSave("dem_gender", cardioDem.gender); }
    if (cardioDem.address) onSave("dem_address", cardioDem.address);
    if (cardioDem.occupation) onSave("dem_occupation", cardioDem.occupation);
    if (cardioDem.referrer) onSave("dem_referral_dr", cardioDem.referrer);
    if (cardioDem.dominance) onSave("dem_dominant", cardioDem.dominance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.demographics]);

  const assessSteps = useMemo(
    () => stepOrder.map((id) => STEP_META.find((s) => s.id === id) || { id, icon: customStepsMeta[id]?.icon || "🩺", label: customStepsMeta[id]?.label || "Assessment" }),
    [stepOrder, customStepsMeta]
  );

  const total = 2 + assessSteps.length;
  const assessIndex = step - 2; // index within assessSteps
  const current = step < 2 ? STEP_META[step] : assessSteps[assessIndex];

  useEffect(() => {
    if (step >= 2 && current) setVisited((v) => new Set(v).add(current.id));
  }, [step, current]);

  function goNext() {
    if (step < total - 1) setStep(step + 1);
  }
  function goBack() {
    if (step > 0) setStep(step - 1);
  }
  function restart() {
    setStep(0);
    setSetting(null);
    setSystem(null);
    setData({});
    setVisited(new Set());
    setStepOrder(ASSESS_STEPS.map((s) => s.id));
    setCustomStepsMeta({});
  }
  function toggleCtItem(id, label, icon) {
    const isAdded = stepOrder.includes(id);
    if (isAdded) {
      setStepOrder((prev) => prev.filter((x) => x !== id));
      setCustomStepsMeta((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setData((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setVisited((v) => {
        const next = new Set(v);
        next.delete(id);
        return next;
      });
      if (current && current.id === id) setStep((s) => Math.max(2, s - 1));
    } else {
      setCustomStepsMeta((m) => ({ ...m, [id]: { icon, label } }));
      setStepOrder((prev) => {
        const summaryIdx = prev.indexOf("summary");
        const insertAt = summaryIdx === -1 ? prev.length : summaryIdx;
        const next = [...prev];
        next.splice(insertAt, 0, id);
        return next;
      });
    }
  }

  const canProceedSetting = step !== 0 || !!setting;
  const canProceedSystem = step !== 1 || !!system;

  return (
    <InfoCardContext.Provider value={setActiveCard}>
    <div className="app-shell">
      <style>{`
        * { box-sizing: border-box; }
        .app-shell {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif;
          background: linear-gradient(180deg, ${BRAND.purpleFaint} 0%, #FFFFFF 220px);
          min-height: 100vh;
          color: ${BRAND.ink};
          display: flex;
          justify-content: center;
        }
        .app-inner { width: 100%; max-width: 480px; min-height: 100vh; display: flex; flex-direction: column; background: #fff; position: relative; }
        .topbar {
          position: sticky; top: 0; z-index: 20; background: #fff;
          border-bottom: 1px solid ${BRAND.border};
          padding: 14px 16px 6px;
        }
        /* Fix (2026-08-20, Aditi): this screen is embedded inside
           AppFull.jsx's own scroll container, which has its own sticky
           mobile header (.pm-mobile-hdr, 64px tall, z-index 101) stuck to
           the SAME top:0 -- without this offset the two sticky elements
           collide and the title/icon renders overlapped/hidden behind the
           app header once scrolled.
           This offset is NOT viewport-relative -- sticky "top" is measured
           from .pm-main's own padding box (64px header + 28px pm-main
           padding-top = 92px), not from the visible viewport edge (which
           looks 24px higher because AppFull.jsx negates that padding with
           a -24px margin on this screen's own mount wrapper). A positive
           64px here (viewport-relative thinking) actually pins the bar
           92+64=156px down, way too low, leaving a large dead gap above it
           (Aditi: "upper area is blank push all above little bit"). -28px
           (92-28=64) pins it flush under the header once scrolled, while
           its natural unscrolled position (68px) is already just 4px below
           the header, so there's no dead gap either way. */
        @media (max-width: 767px) {
          .topbar { top: -28px; }
        }
        .topbar-row { display: flex; align-items: center; gap: 10px; }
        .back-btn {
          border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purple};
          width: 32px; height: 32px; border-radius: 10px; font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .topbar-title { font-weight: 700; font-size: 16px; flex: 1; }
        .topbar-breadcrumb { font-size: 12px; color: ${BRAND.gray}; margin-top: 2px; }
        .progress-label { font-size: 11px; color: ${BRAND.gray}; padding: 2px 2px 8px; }

        .step-nav { display: flex; gap: 6px; overflow-x: auto; padding: 8px 2px 2px; scrollbar-width: none; -ms-overflow-style: none; }
        .step-nav::-webkit-scrollbar { display: none; }
        .step-circle {
          flex: 0 0 auto; width: 30px; height: 30px; border-radius: 50%;
          border: 1.5px solid ${BRAND.border}; background: #fff; font-size: 13px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          color: ${BRAND.grayLight}; transition: all .15s;
        }
        .step-active { border-color: ${BRAND.purple}; background: ${BRAND.purple}; color: #fff; transform: scale(1.14); box-shadow: 0 4px 10px rgba(108,77,255,.35); }
        .step-seen { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; }
        .step-add { border-style: dashed; border-color: ${BRAND.purple}; color: ${BRAND.purple}; font-weight: 800; font-size: 16px; background: #fff; }
        .stepnav-wrap { position: relative; }
        .ct-modal { position: absolute; inset: 0; background: #fff; z-index: 50; display: flex; flex-direction: column; }
        .ct-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 16px 10px; border-bottom: 1px solid ${BRAND.border}; }
        .ct-modal-title { font-weight: 800; font-size: 16px; }
        .ct-modal-close { border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purple}; width: 30px; height: 30px; border-radius: 10px; font-size: 14px; cursor: pointer; flex-shrink: 0; }
        .ct-search-wrap { padding: 10px 16px; border-bottom: 1px solid ${BRAND.border}; }
        .ct-search { width: 100%; border: 1.5px solid ${BRAND.border}; border-radius: 12px; padding: 10px 12px; font-size: 14px; outline: none; font-family: inherit; }
        .ct-modal-body { flex: 1; overflow-y: auto; padding: 14px 16px 16px; }
        .ct-group { margin-bottom: 20px; }
        .ct-group-title { font-weight: 700; font-size: 11.5px; color: ${BRAND.purpleDark}; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
        .ct-item { width: 100%; display: flex; align-items: center; gap: 10px; border: none; background: transparent; padding: 9px 4px; font-size: 14px; text-align: left; cursor: pointer; color: ${BRAND.ink}; border-radius: 10px; }
        .ct-item:active { background: ${BRAND.purpleFaint}; }
        .ct-item-checked { color: ${BRAND.purpleDark}; font-weight: 600; }
        .ct-checkbox { font-size: 16px; color: ${BRAND.purple}; flex-shrink: 0; }
        .ct-modal-footer { padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid ${BRAND.border}; }

        /* Bug fix (2026-08-19): extra clearance for .bottombar's switch
           from sticky to fixed below -- fixed takes the bar fully out of
           document flow, so content needs enough bottom padding to never
           sit underneath it (bar height + physiom's own fixed bottom nav
           clearance, see .bottombar's comment). */
        .content { flex: 1; padding: 18px 16px 150px; }

        .section-intro { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 18px; }
        .section-intro-icon { font-size: 26px; line-height: 1; }
        .section-intro-title { font-weight: 800; font-size: 19px; letter-spacing: -0.01em; }
        .section-intro-sub { font-size: 13px; color: ${BRAND.gray}; margin-top: 2px; }

        .subheading { font-weight: 700; font-size: 13px; color: ${BRAND.purpleDark}; text-transform: uppercase; letter-spacing: .04em; margin: 22px 0 10px; }

        .field-block { margin-bottom: 16px; }
        .field-label-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
        .field-label { font-weight: 600; font-size: 14px; color: ${BRAND.ink}; }
        .hint { font-size: 12px; color: ${BRAND.gray}; margin-top: 6px; font-style: italic; line-height: 1.4; }

        /* One-tap "fill the normal/negative baseline" button -- see
           CardioSection's markAllNormal() comment for why this exists. */
        .quick-normal-btn { display: block; width: 100%; border: 1.5px solid ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-weight: 700; font-size: 13.5px; padding: 11px; border-radius: 14px; cursor: pointer; margin-bottom: 14px; }
        .quick-normal-btn:active { transform: scale(0.98); }

        .info-btn-wrap { display: inline-flex; }
        .info-btn { border: 1px solid ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; padding: 3px 8px; border-radius: 999px; cursor: pointer; white-space: nowrap; }
        .info-popover-backdrop { position: fixed; inset: 0; z-index: 1070; background: rgba(20,10,45,.45); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .info-popover { position: relative; z-index: 1071; width: 320px; max-width: 100%; background: ${BRAND.ink}; color: #EDEBFB; border-radius: 12px; padding: 12px 14px; font-size: 12.5px; line-height: 1.5; box-shadow: 0 10px 30px rgba(20,10,60,.3); }
        .info-popover p { margin: 0; padding-right: 14px; }
        .info-popover-close { position: absolute; top: 8px; right: 8px; border: none; background: transparent; color: #B8AEEF; font-size: 11px; cursor: pointer; }

        .info-card-btn { width: 20px; height: 20px; flex: none; display: inline-flex; align-items: center; justify-content: center; border: 1px solid ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; border-radius: 50%; font-size: 12px; line-height: 1; cursor: pointer; padding: 0; }

        .text-input-wrap, .select-wrap { position: relative; display: flex; align-items: center; gap: 6px; background: #fff; border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 4px 6px 4px 12px; }
        .text-input, .select-input { flex: 1; border: none; outline: none; font-size: 14px; padding: 8px 4px; background: transparent; min-width: 0; }
        .combo-unit { font-size: 12px; color: ${BRAND.gray}; padding: 0 6px; white-space: nowrap; }
        .select-btn { flex-shrink: 0; border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-size: 11px; font-weight: 700; padding: 8px 10px; border-radius: 10px; cursor: pointer; white-space: nowrap; }

        .select-popover { position: absolute; top: calc(100% + 6px); right: 0; width: min(78%, 260px); background: #fff; border: 1px solid ${BRAND.border}; border-radius: 14px; box-shadow: 0 10px 28px rgba(20,10,60,.16); z-index: 35; padding: 8px 10px 10px; display: flex; flex-direction: column; max-height: min(52vh, 320px); }
        .popover-head { display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: ${BRAND.gray}; padding: 2px 2px 6px; flex-shrink: 0; }
        .popover-close { border: none; background: transparent; color: ${BRAND.grayLight}; cursor: pointer; font-size: 13px; padding: 4px; line-height: 1; }
        .popover-list { display: flex; flex-direction: column; overflow-y: auto; flex: 1 1 auto; min-height: 0; }
        .popover-item { display: flex; align-items: center; gap: 9px; border: none; border-bottom: 1px solid ${BRAND.border}; background: transparent; color: ${BRAND.ink}; padding: 9px 2px; border-radius: 0; font-size: 13px; text-align: left; cursor: pointer; line-height: 1.3; }
        .popover-item:last-child { border-bottom: none; }
        .popover-item-label { flex: 1; }
        .popover-check-icon { flex-shrink: 0; width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid ${BRAND.border}; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; }
        .popover-check-icon-radio { border-radius: 50%; }
        .popover-check-icon-active { background: ${BRAND.purple}; border-color: ${BRAND.purple}; }
        .popover-item-active { color: ${BRAND.purpleDark}; font-weight: 600; }
        .popover-done { margin-top: 8px; flex-shrink: 0; width: 100%; border: none; background: ${BRAND.purple}; color: #fff; padding: 10px; border-radius: 10px; font-weight: 700; font-size: 12.5px; cursor: pointer; }

        /* Refined-chip look (2026-08-27, user request) -- individually
           bordered pills instead of the old shared lavender tray, applied
           via these same class names so no call site needed to change. */
        .segmented { display: flex; flex-wrap: wrap; gap: 8px; }
        .seg-btn {
          flex: 0 1 auto; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.ink};
          padding: 9px 13px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer;
          transition: transform .1s ease-out, box-shadow .1s ease-out, background .1s ease-out;
        }
        .seg-btn:active { transform: scale(.95); }
        .seg-active { background: ${BRAND.purple}; color: #fff; border-color: ${BRAND.purple}; box-shadow: 0 4px 10px rgba(108,77,255,.24); }

        .vitals-grid { display: flex; flex-wrap: wrap; gap: 10px 12px; margin-bottom: 6px; }
        .vital-field { flex: 1 1 45%; min-width: 120px; }
        .vital-label-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .vital-label { font-size: 12px; color: ${BRAND.gray}; font-weight: 600; }
        .vital-input-wrap { display: flex; align-items: center; border: 1.5px solid ${BRAND.border}; border-radius: 12px; padding: 6px 10px; background: #fff; }
        .vital-input { border: none; outline: none; font-size: 15px; width: 100%; font-weight: 600; background: transparent; }
        .vital-unit { font-size: 11px; color: ${BRAND.grayLight}; white-space: nowrap; }

        /* min-width: 0 overrides the flex-item default of min-width: auto --
           without it a wide child (e.g. a text combobox, not just this
           module's narrow NumberFields) would refuse to shrink and could
           overflow past the screen edge, same bug confirmed in
           NeurologicalAssessment.jsx's identical .row-2 definition. */
        .row-2 { display: flex; gap: 12px; align-items: flex-end; }
        .row-2 > * { min-width: 0; }

        .textarea { width: 100%; border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 10px 12px; font-size: 14px; font-family: inherit; outline: none; resize: vertical; }

        .scale-wrap { display: flex; align-items: center; gap: 12px; }
        .scale-range { flex: 1; accent-color: ${BRAND.purple}; }
        .scale-readout { font-weight: 700; font-size: 15px; color: ${BRAND.purple}; min-width: 36px; text-align: right; }
        .scale-max { font-weight: 400; font-size: 11px; color: ${BRAND.grayLight}; }

        .lr-grid { border: 1.5px solid ${BRAND.border}; border-radius: 14px; overflow: hidden; }
        .lr-row { display: flex; border-bottom: 1px solid ${BRAND.border}; }
        .lr-row:last-child { border-bottom: none; }
        .lr-head { background: ${BRAND.purpleFaint}; }
        .lr-cell { flex: 1; padding: 8px 6px; font-size: 12px; display: flex; align-items: center; }
        .lr-zone { flex: 1.1; font-weight: 600; color: ${BRAND.ink}; }
        .lr-colhead { font-weight: 700; color: ${BRAND.purpleDark}; justify-content: center; }
        .lr-select { width: 100%; border: 1px solid ${BRAND.border}; border-radius: 8px; padding: 5px 4px; font-size: 12px; background: #fff; }

        .alert { border-radius: 12px; padding: 12px 14px; font-size: 13px; margin-bottom: 14px; line-height: 1.5; font-weight: 500; }
        .alert-red { background: ${BRAND.redBg}; color: #8A1F1F; border: 1px solid #F4C6C6; }
        .alert-amber { background: ${BRAND.amberBg}; color: #8A5A0A; border: 1px solid #F5DBA6; }
        .alert-green { background: ${BRAND.greenBg}; color: #12603A; border: 1px solid #B8E6CC; }

        .picker-grid { display: flex; flex-direction: column; gap: 10px; }
        .picker-card { display: flex; align-items: center; gap: 14px; border: 1.5px solid ${BRAND.border}; border-radius: 16px; padding: 14px; background: #fff; cursor: pointer; text-align: left; transition: all .15s; }
        .picker-card:active { transform: scale(0.98); }
        .picker-card.selected { border-color: ${BRAND.purple}; background: ${BRAND.purpleFaint}; }
        .picker-icon { font-size: 24px; width: 40px; text-align: center; flex-shrink: 0; }
        .picker-label { font-weight: 700; font-size: 15px; }
        .picker-desc { font-size: 12px; color: ${BRAND.gray}; margin-top: 1px; }

        .summary-card { border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 12px 14px; margin-bottom: 12px; }
        .summary-title { font-weight: 700; font-size: 13px; color: ${BRAND.purpleDark}; margin-bottom: 8px; }
        .summary-row { display: flex; gap: 8px; font-size: 12.5px; padding: 3px 0; border-top: 1px solid #F5F3FB; }
        .summary-row:first-child { border-top: none; }
        .summary-key { flex: 0 0 42%; color: ${BRAND.gray}; text-transform: capitalize; }
        .summary-val { flex: 1; font-weight: 500; word-break: break-word; }

        /* Bug fix (2026-08-19, Aditi's request): "position: sticky" here
           never actually stuck -- .content/.app-inner/.app-wrap (its real
           ancestors) don't scroll themselves, so sticky resolved against
           physiom's OWN outer .pm-main scroll container instead, whose box
           just grows to fit this whole assessment rather than scrolling
           internally -- there was nothing for "stick to the bottom of" to
           mean. Back/Next just sat at the natural end of the page content,
           requiring a full scroll to reach on every step. "fixed" escapes
           all of that and pins to the real viewport; bottom:60px (not 0)
           leaves clearance above physiom's own fixed bottom nav bar
           (.pm-bnav in src/utils.jsx, ~59px tall) so the two don't overlap. */
        .bottombar { position: fixed; left: 50%; transform: translateX(-50%); bottom: 60px; width: 100%; max-width: 480px; z-index: 25; background: #fff; border-top: 1px solid ${BRAND.border}; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 10px; }
        .ghost-btn { flex: 0 0 auto; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.ink}; padding: 13px 18px; border-radius: 14px; font-weight: 600; font-size: 14px; cursor: pointer; }
        .primary-btn {
        flex: 1; border: none; background: linear-gradient(90deg, ${BRAND.purple}, ${BRAND.purpleDark}); color: #fff;
        padding: 14px 18px; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer;
        box-shadow: 0 6px 16px rgba(108,77,255,.28); position: relative; overflow: hidden;
        transition: transform .1s ease-out, box-shadow .1s ease-out, filter .1s ease-out;
      }
      /* Real press feedback -- depress + flatten shadow + slight darken (ripple itself comes from rippleEffect.js, injected via JS since .primary-btn is duplicated across several independently-loaded modules rather than one shared stylesheet). */
      .primary-btn:active { transform: scale(.97); box-shadow: 0 2px 6px rgba(108,77,255,.22); filter: brightness(.96); }
      .ai-treatment-cta { width: 100%; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; border: 1.5px solid ${BRAND.purple}; border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; background: linear-gradient(135deg, ${BRAND.purpleFaint}, #fff 70%); cursor: pointer; text-align: left; font-family: inherit; }
      .ai-treatment-cta-title { font-weight: 800; font-size: 14px; color: ${BRAND.purpleDark}; }
      .ai-treatment-cta-sub { font-size: 11.5px; color: ${BRAND.gray}; }
        .primary-btn:disabled { opacity: .4; cursor: not-allowed; box-shadow: none; }
      `}</style>

      <div className="app-inner">
        <div className="topbar">
          <div className="topbar-row">
            {step > 0 && (
              <button className="back-btn" onClick={goBack} aria-label="Back">
                ←
              </button>
            )}
            <div>
              <div className="topbar-title">
                {step === 0 ? "🫀🫁 Cardiopulmonary Assessment" : current.icon ? `${current.icon} ${current.label}` : current.label}
              </div>
              {step >= 2 && (
                <div className="topbar-breadcrumb">
                  {SETTINGS.find((s) => s.id === setting)?.label} · {setting === "rehab" && system ? rehabSubLabel(system) : SYSTEMS.find((s) => s.id === system)?.label}
                </div>
              )}
            </div>
            {step >= 2 && current.id !== "summary" && (
              <button className="back-btn" onClick={() => setReviewOpen(true)} aria-label="Review filled so far" title="Review filled so far">
                ✅
              </button>
            )}
          </div>
          {step >= 2 && (
            <>
              <div className="stepnav-wrap">
                <StepNav
                  steps={assessSteps}
                  currentIndex={assessIndex}
                  visited={visited}
                  onJump={(i) => setStep(2 + i)}
                  onAddClick={() => setAddStepOpen(true)}
                />
              </div>
              <div className="progress-label">
                Step {assessIndex + 1} of {assessSteps.length}
              </div>
            </>
          )}
        </div>

        <div className="content">
          {step === 0 && (
            <>
              <SectionIntro icon="🏥" title="Where is the patient being assessed?" sub="Select the patient setting to configure the assessment — 5 settings × 3 systems = 15 pathways." />
              <div className="picker-grid">
                {SETTINGS.map((s) => (
                  <button key={s.id} className={"picker-card" + (setting === s.id ? " selected" : "")} onClick={() => setSetting(s.id)}>
                    <div className="picker-icon">{s.icon}</div>
                    <div>
                      <div className="picker-label">{s.label}</div>
                      <div className="picker-desc">{s.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <SectionIntro icon="🫀🫁" title="What are you primarily assessing?" sub="This determines how much detail each section shows." />
              <div className="picker-grid">
                {SYSTEMS.map((s) => {
                  const desc = setting === "rehab" ? `→ ${rehabSubLabel(s.id)}` : s.desc;
                  return (
                    <button key={s.id} className={"picker-card" + (system === s.id ? " selected" : "")} onClick={() => setSystem(s.id)}>
                      <div className="picker-icon">{s.icon}</div>
                      <div>
                        <div className="picker-label">{s.label}</div>
                        <div className="picker-desc">{desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {current.id === "demographics" && <DemographicsSection data={data} setData={setData} />}
          {current.id === "safety" && <SafetySection data={data} setData={setData} setting={setting} />}
          {current.id === "subjective" && <SubjectiveSection data={data} setData={setData} />}
          {current.id === "chart" && <ChartSection data={data} setData={setData} setting={setting} system={system} />}
          {current.id === "vitals" && <VitalsSection data={data} setData={setData} system={system} />}
          {current.id === "cardio" && <CardioSection data={data} setData={setData} system={system} />}
          {current.id === "resp" && <RespSection data={data} setData={setData} system={system} />}
          {current.id === "functional" && <FunctionalSection data={data} setData={setData} setting={setting} />}
          {current.id === "exercise" && <ExerciseSection data={data} setData={setData} setting={setting} />}
          {current.id === "outcomes" && <OutcomesSection data={data} setData={setData} setting={setting} system={system} />}
          {current.id === "interpretation" && <InterpretationSection data={data} setData={setData} />}
          {current.id === "precautions" && <PrecautionsSection data={data} setData={setData} setting={setting} system={system} />}
          {current.id === "summary" && <SummarySection setting={setting} system={system} data={data} setData={setData} assessSteps={assessSteps} />}
          {current.id.startsWith("ct-") && <CustomSection id={current.id} meta={current} data={data} setData={setData} />}
        </div>

        <div className="bottombar">
          {step > 0 && step < total - 1 && (
            <button className="ghost-btn" onClick={goBack}>
              Back
            </button>
          )}
          {step === total - 1 ? (
            // Summary & Review is the last step -- (2026-08-20, Aditi:
            // "after the assessment last page summary and review should
            // show as save assessment or edit more") data already
            // autosaves on every change (see the onSave effect above), so
            // "Save Assessment" is really "I'm done, take me back" rather
            // than a separate write; "Edit More" jumps back to Patient
            // Information (step 2) so the step-nav pills are available to
            // revisit any section. The old "Start new assessment" button
            // here silently wiped the whole record via restart() -- far
            // too destructive for the primary action on this screen.
            <>
              <button className="ghost-btn" onClick={() => setStep(2)}>
                ✏️ Edit More
              </button>
              <button className="primary-btn" onClick={() => onNav?.("clinical")}>
                ✅ Save Assessment
              </button>
            </>
          ) : (
            <button className="primary-btn" disabled={!canProceedSetting || !canProceedSystem} onClick={goNext}>
              {step === 0 ? "Continue to system" : step === total - 2 ? "Review & finish" : "Next"}
            </button>
          )}
        </div>

        {addStepOpen && <AddAssessmentModal addedIds={new Set(stepOrder)} onToggle={toggleCtItem} onClose={() => setAddStepOpen(false)} />}
        {reviewOpen && (
          <div className="ct-modal">
            <div className="ct-modal-header">
              <div className="ct-modal-title">✅ Review So Far</div>
              <button type="button" className="ct-modal-close" onClick={() => setReviewOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="ct-modal-body">
              <SummarySection setting={setting} system={system} data={data} assessSteps={assessSteps} />
            </div>
          </div>
        )}
        <InfoCard data={activeCard} onClose={() => setActiveCard(null)} />
      </div>
    </div>
    </InfoCardContext.Provider>
  );
}

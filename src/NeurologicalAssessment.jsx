import React, { useState, useMemo, useRef, useEffect, useContext, createContext } from "react";
import InfoCard from "./InfoCard.jsx";
import { neuroConditionLibraryData } from "./neuroConditionLibraryData.js";
import { neuroExamLibraryData } from "./neuroExamLibraryData.js";
import { NEURO_TREATMENT_CATALOG, EVIDENCE_SOURCES, PROBLEM_PRIORITY_ORDER, REHAB_PHASES, LIMITED_EVIDENCE_NOTICE } from "./neuroTreatmentCatalog.js";

// Opens the rich InfoCard overlay (Perform/Scale/Interpret tabs, same
// component Cardiopulmonary Assessment already uses) from anywhere in the
// field tree below, without prop-drilling a setter through every wrapper.
const InfoCardContext = createContext(null);

// neuroConditionLibraryData is keyed "Category|||Label" -- the exact
// [cat, label] pairs already used as NEURO_LIBRARY/NEURO_RENDERERS keys
// below, so a renderer can pull its InfoCard data with the same two
// strings it already keys off via neuroId().
function condInfo(cat, label) {
  return neuroConditionLibraryData[`${cat}|||${label}`];
}

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
   STATIC DATA — Step 1 selector (setting only — Neuro is a
   single system, per O'Sullivan: setting drives the core exam,
   condition is added on top rather than branching the whole form)
   ============================================================ */
const SETTINGS = [
  { id: "inpatient", icon: "🏥", label: "Inpatient", desc: "Acute / ward patient" },
  { id: "icu", icon: "🚨", label: "ICU", desc: "Critical care, closely monitored" },
  { id: "postop", icon: "🛏️", label: "Post-operative", desc: "Neurosurgical / spinal recovery" },
  { id: "outpatient", icon: "🚶", label: "Outpatient", desc: "OPD / clinic-based" },
  { id: "rehab", icon: "♿", label: "Neuro Rehabilitation", desc: "Structured inpatient/outpatient neuro rehab" },
];

const STEP_META = [
  { id: "setting", label: "Setting" },
  { id: "demographics", icon: "📋", label: "Patient Information" },
  { id: "safety", icon: "🚨", label: "Safety / Medical Stability" },
  { id: "subjective", icon: "🗣️", label: "Subjective Assessment" },
  { id: "chart", icon: "🗂️", label: "Medical / Chart Review" },
  { id: "cognition", icon: "🧠", label: "Mental Status / Cognition" },
  { id: "cranial", icon: "👁️", label: "Cranial Nerve Screen" },
  { id: "sensory", icon: "🖐️", label: "Sensory Examination" },
  { id: "motor", icon: "💪", label: "Motor Examination" },
  { id: "tone", icon: "⚡", label: "Tone / Reflexes" },
  { id: "coordination", icon: "🎯", label: "Coordination" },
  { id: "balance", icon: "⚖️", label: "Balance" },
  { id: "gait", icon: "🚶", label: "Gait Assessment" },
  { id: "functional", icon: "🛏️", label: "Functional Assessment" },
  { id: "outcomes", icon: "📊", label: "Outcome Measures" },
  { id: "interpretation", icon: "🧠", label: "Clinical Interpretation" },
  { id: "precautions", icon: "⚠️", label: "Precautions" },
  { id: "aiTreatment", icon: "✨", label: "AI Treatment Suggestions" },
  { id: "summary", icon: "✅", label: "Summary & Review" },
];
const ASSESS_STEPS = STEP_META.slice(1); // 16 core steps shown in the step nav

/* ============================================================
   GENERIC FIELD COMPONENTS — same widgets/interaction pattern
   as the Cardiopulmonary module (purple ▾ = pick from list or
   type manually; ℹ How to = separate educational popover)
   ============================================================ */
function Hint({ children }) {
  if (!children) return null;
  return <div className="hint">💡 {children}</div>;
}

function InfoButton({ text }) {
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
    <span className="info-btn-wrap" ref={ref}>
      <button type="button" className="info-btn" onClick={() => setOpen((o) => !o)}>
        ℹ How to
      </button>
      {open && (
        <div className="info-popover">
          <button type="button" className="info-popover-close" onClick={() => setOpen(false)} aria-label="Close">
            ✕
          </button>
          <p>{text}</p>
        </div>
      )}
    </span>
  );
}

// Small ⓘ trigger for the rich InfoCard overlay -- replaces the plain-text
// InfoButton wherever a field has a matching neuroConditionLibraryData
// entry. Same pattern as CardiopulmonaryAssessment.jsx's InfoCardButton.
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
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query ? options.filter((o) => o.toLowerCase().includes(query)) : options;
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
      {options.length > 6 && (
        <input className="popover-search" placeholder="🔍 Search" value={q} onChange={(e) => setQ(e.target.value)} />
      )}
      <div className="popover-list">
        {filtered.map((opt) => {
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
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" className="select-btn" onClick={() => setOpen((o) => !o)} aria-label="Choose from list">
          ▾
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
      <div className="vital-label-row">
        <span className="vital-label">{label}</span>
        {info ? <InfoCardButton data={info} /> : howTo && <InfoButton text={howTo} />}
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
          step={1}
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

/* Left/Right (or multi-column) grading grid — used throughout for
   dermatomes, myotomes, DTRs, MMT, tone, etc. */
// rowInfo (optional): { [rowLabel]: InfoCard data } -- adds a small ⓘ next
// to that specific row's label, for grids where each row is really its own
// distinct test/reflex (e.g. DTRs) rather than one shared technique.
function LRGrid({ label, rows, columns = ["Right", "Left"], options, value = {}, onChange, hint, howTo, info, rowInfo }) {
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
            <div className="lr-cell lr-zone" style={rowInfo?.[r] ? { display: "flex", alignItems: "center", gap: 4 } : undefined}>
              {r}
              {rowInfo?.[r] && <InfoCardButton data={rowInfo[r]} />}
            </div>
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

/* Top step nav — small circles per step, tap to jump anywhere.
   Scrolls only its own horizontal strip (container.scrollTo) instead
   of el.scrollIntoView, which can otherwise drag the whole page
   vertically when the active circle is near the edge of the screen. */
function StepNav({ steps, currentIndex, visited, onJump, onAddClick }) {
  const refs = useRef([]);
  useEffect(() => {
    const el = refs.current[currentIndex];
    const container = el && el.parentElement;
    if (el && container) {
      const target = el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left: target, behavior: "smooth" });
    }
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
      <button type="button" className="step-circle step-add" onClick={onAddClick} aria-label="Add a neuro assessment" title="Add a neuro assessment">
        +
      </button>
    </div>
  );
}

/* ============================================================
   GRADING SCALES — kept as named constants so every screen that
   uses (say) DTR grading uses the exact same clinical scale
   ============================================================ */
const MMT_GRADES = [
  "5 - Normal (full ROM vs. resistance)",
  "4 - Good (full ROM vs. some resistance)",
  "3 - Fair (full ROM vs. gravity only)",
  "2 - Poor (full ROM, gravity eliminated)",
  "1 - Trace (flicker/no motion)",
  "0 - No contraction",
];
const MAS_GRADES = [
  "0 - No increase in tone",
  "1 - Slight increase, catch and release",
  "1+ - Slight increase, catch + minimal resistance <50% ROM",
  "2 - More marked increase through most of ROM",
  "3 - Considerable increase, passive movement difficult",
  "4 - Rigid in flexion or extension",
];
const DTR_GRADES = ["0 - Absent", "1+ - Diminished", "2+ - Normal", "3+ - Brisk", "4+ - Hyperactive / clonus"];
const SENSORY_GRADES = ["Intact", "Impaired", "Absent", "Hyperesthesia", "Paresthesia", "Not testable"];
const BALANCE_GRADES = ["Normal", "Good", "Fair", "Poor", "Absent"];
const TONE_TYPES = ["Normal", "Hypotonia", "Flaccidity", "Hypertonia", "Spasticity", "Rigidity (cogwheel)", "Rigidity (lead-pipe)", "Variable / fluctuating"];

/* ============================================================
   ADD-ON LIBRARY — condition-specific items applied ON TOP of
   the core exam, matching O'Sullivan's "core exam + condition
   application" model rather than 30 separate full templates
   ============================================================ */
const NEURO_LIBRARY = [
  {
    cat: "Stroke",
    icon: "🧠",
    items: [
      "Higher mental function screen",
      "Neglect / inattention",
      "Visual field screen",
      "Synergy pattern (UE/LE)",
      "Selective motor control",
      "Brunnstrom recovery stage",
      "Fugl-Meyer Assessment",
      "Modified Rankin Scale",
    ],
  },
  {
    cat: "Parkinson's Disease",
    icon: "🌀",
    items: [
      "Bradykinesia",
      "Rigidity type",
      "Resting tremor",
      "Postural instability (pull test)",
      "Freezing of gait",
      "Turning / axial rotation",
      "Dual-task gait",
      "Hoehn & Yahr staging",
    ],
  },
  {
    cat: "Spinal Cord Injury",
    icon: "🦴",
    items: [
      "Neurological level of injury",
      "Myotome grading (ASIA key muscles)",
      "Dermatome grading (ASIA sensory)",
      "ASIA Impairment Scale (AIS)",
      "Sitting balance (SCI)",
      "Transfer ability",
      "Wheelchair mobility",
      "Autonomic dysreflexia screen",
    ],
  },
  {
    cat: "Multiple Sclerosis",
    icon: "🔥",
    items: [
      "Fatigue screen",
      "Nystagmus / INO screen",
      "Lhermitte's sign",
      "Uhthoff's phenomenon",
      "EDSS staging",
      "Bladder / bowel function",
    ],
  },
  {
    cat: "Traumatic Brain Injury",
    icon: "💥",
    items: ["Rancho Los Amigos level", "Post-traumatic amnesia screen", "Agitation / behaviour screen"],
  },
  {
    cat: "Vestibular Disorders",
    icon: "🌀",
    items: ["Dix-Hallpike test", "Head impulse test", "Nystagmus assessment", "Dynamic Gait Index", "Dizziness Handicap Inventory screen"],
  },
  {
    cat: "Neuro-Respiratory",
    icon: "🫁",
    items: ["Respiratory status", "Cough effectiveness", "Breathing pattern", "Secretion assessment"],
  },
  {
    cat: "Communication / Bulbar",
    icon: "🗣️",
    items: ["Dysarthria screen", "Voice / speech intelligibility", "Swallowing screen"],
  },
  {
    cat: "Peripheral Nerve",
    icon: "🧬",
    items: ["Neurodynamic / neural mobility testing", "Tinel's sign", "Muscle wasting", "Peripheral sensory/motor distribution"],
  },
  {
    cat: "Ataxia",
    icon: "🧭",
    items: ["SARA (Scale for Assessment and Rating of Ataxia)", "Truncal ataxia screen"],
  },
];

function neuroId(cat, label) {
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `nx-${slug(cat)}-${slug(label)}`;
}

const NEURO_RENDERERS = {
  /* ---------------- Stroke ---------------- */
  [neuroId("Stroke", "Higher mental function screen")]: (d, set) => (
    <SelectField
      label="Higher mental function"
      type="multi"
      options={["Intact", "Impaired judgement", "Impaired problem-solving", "Impaired initiation", "Impulsivity", "Impaired safety awareness"]}
      value={d.hmf}
      onChange={(v) => set("hmf", v)}
      info={condInfo("Stroke", "Higher mental function screen")}
    />
  ),
  [neuroId("Stroke", "Neglect / inattention")]: (d, set) => (
    <>
      <SelectField label="Neglect type" type="multi" options={["None", "Left visual neglect", "Right visual neglect", "Personal neglect", "Extrapersonal neglect", "Anosognosia"]} value={d.neglectType} onChange={(v) => set("neglectType", v)} info={condInfo("Stroke", "Neglect / inattention")} />
      <SelectField
        label="Screening test used"
        type="single"
        options={["Line bisection", "Cancellation task", "Clock drawing", "Star cancellation", "Not tested"]}
        value={d.neglectTest}
        onChange={(v) => set("neglectTest", v)}
        howTo="Line bisection: patient marks the midpoint of a horizontal line — a shift away from the neglected side is positive. Cancellation/star cancellation: patient crosses out targets scattered across a page — missed targets cluster on the neglected side."
      />
    </>
  ),
  [neuroId("Stroke", "Visual field screen")]: (d, set) => (
    <SelectField
      label="Visual fields (confrontation)"
      type="single"
      options={["Full fields", "Left homonymous hemianopia", "Right homonymous hemianopia", "Quadrantanopia", "Not tested"]}
      value={d.visualField}
      onChange={(v) => set("visualField", v)}
      info={condInfo("Stroke", "Visual field screen")}
    />
  ),
  [neuroId("Stroke", "Synergy pattern (UE/LE)")]: (d, set) => (
    <>
      <SelectField label="UE synergy present" type="single" options={["None", "Flexor synergy", "Extensor synergy", "Mixed/out-of-synergy movement emerging"]} value={d.ueSynergy} onChange={(v) => set("ueSynergy", v)} info={condInfo("Stroke", "Synergy pattern (UE/LE)")} />
      <SelectField label="LE synergy present" type="single" options={["None", "Flexor synergy", "Extensor synergy", "Mixed/out-of-synergy movement emerging"]} value={d.leSynergy} onChange={(v) => set("leSynergy", v)} howTo="Flexor LE synergy: hip flexion/abduction/ER, knee flexion, ankle dorsiflexion/inversion. Extensor LE synergy: hip extension/adduction/IR, knee extension, ankle plantarflexion/inversion." />
    </>
  ),
  [neuroId("Stroke", "Selective motor control")]: (d, set) => (
    <SelectField
      label="Selective motor control"
      type="single"
      options={["Normal isolated movement", "Movement only within synergy", "Minimal isolated movement emerging", "No volitional movement"]}
      value={d.selectiveControl}
      onChange={(v) => set("selectiveControl", v)}
      info={condInfo("Stroke", "Selective motor control")}
    />
  ),
  [neuroId("Stroke", "Brunnstrom recovery stage")]: (d, set) => (
    <>
      <SelectField label="Arm" type="single" options={["I - Flaccid", "II - Synergy emerging, spasticity begins", "III - Synergy voluntary, spasticity marked", "IV - Movement out of synergy begins", "V - Relative independence from synergy", "VI - Near-normal isolated movement"]} value={d.brunnstromArm} onChange={(v) => set("brunnstromArm", v)} info={condInfo("Stroke", "Brunnstrom recovery stage")} />
      <SelectField label="Hand" type="single" options={["I - Flaccid", "II - Minimal finger flexion", "III - Mass grasp, no release", "IV - Lateral prehension, some release", "V - Palmar prehension, cylindrical/spherical grasp", "VI - Near-normal finger movement"]} value={d.brunnstromHand} onChange={(v) => set("brunnstromHand", v)} />
      <SelectField label="Leg" type="single" options={["I - Flaccid", "II - Synergy emerging, spasticity begins", "III - Synergy voluntary, spasticity marked", "IV - Movement out of synergy begins", "V - Relative independence from synergy", "VI - Near-normal isolated movement"]} value={d.brunnstromLeg} onChange={(v) => set("brunnstromLeg", v)} howTo="6-stage model of post-stroke motor recovery (Brunnstrom): flaccidity → synergy emerges → synergy peaks with spasticity → movement begins to break from synergy → spasticity declines → near-normal coordination." />
    </>
  ),
  [neuroId("Stroke", "Fugl-Meyer Assessment")]: (d, set) => (
    <>
      <div className="vitals-grid">
        <NumberField label="UE motor" value={d.fmUE} onChange={(v) => set("fmUE", v)} unit="/66" width="45%" info={condInfo("Stroke", "Fugl-Meyer Assessment")} />
        <NumberField label="LE motor" value={d.fmLE} onChange={(v) => set("fmLE", v)} unit="/34" width="45%" />
        <NumberField label="Balance" value={d.fmBalance} onChange={(v) => set("fmBalance", v)} unit="/14" width="45%" />
        <NumberField label="Sensation" value={d.fmSensation} onChange={(v) => set("fmSensation", v)} unit="/24" width="45%" />
      </div>
      <Hint>Standardised measure of post-stroke motor recovery, balance, sensation and joint function — higher score reflects less impairment.</Hint>
    </>
  ),
  [neuroId("Stroke", "Modified Rankin Scale")]: (d, set) => (
    <SelectField
      label="Modified Rankin Scale (mRS)"
      type="single"
      options={["0 - No symptoms", "1 - No significant disability", "2 - Slight disability", "3 - Moderate disability", "4 - Moderately severe disability", "5 - Severe disability", "6 - Death"]}
      value={d.mrs}
      onChange={(v) => set("mrs", v)}
      info={condInfo("Stroke", "Modified Rankin Scale")}
    />
  ),
  [neuroId("Stroke", "Functional mobility (stroke)")]: (d, set) => (
    <SelectField label="Functional mobility level" type="single" options={["Independent", "Supervision", "Minimal assist", "Moderate assist", "Maximal assist", "Dependent"]} value={d.funcMobility} onChange={(v) => set("funcMobility", v)} info={condInfo("Stroke", "Functional mobility (stroke)")} />
  ),

  /* ---------------- Parkinson's Disease ---------------- */
  [neuroId("Parkinson's Disease", "Bradykinesia")]: (d, set) => (
    <SelectField label="Bradykinesia" type="multi" options={["None", "Slowed finger tapping", "Slowed hand movements", "Slowed leg agility", "Decreased arm swing", "Hypomimia (masked face)", "Micrographia"]} value={d.bradykinesia} onChange={(v) => set("bradykinesia", v)} info={condInfo("Parkinson's Disease", "Bradykinesia")} />
  ),
  [neuroId("Parkinson's Disease", "Rigidity type")]: (d, set) => (
    <SelectField label="Rigidity" type="single" options={["None", "Cogwheel rigidity", "Lead-pipe rigidity", "Present, distribution unclear"]} value={d.rigidityType} onChange={(v) => set("rigidityType", v)} info={condInfo("Parkinson's Disease", "Rigidity type")} />
  ),
  [neuroId("Parkinson's Disease", "Resting tremor")]: (d, set) => (
    <>
      <SelectField label="Distribution" type="multi" options={["None", "Right hand", "Left hand", "Right leg", "Left leg", "Jaw/chin", "Head"]} value={d.tremorDist} onChange={(v) => set("tremorDist", v)} info={condInfo("Parkinson's Disease", "Resting tremor")} />
      <ScaleField label="Severity (0-4)" value={d.tremorSeverity} onChange={(v) => set("tremorSeverity", v)} max={4} howTo="Classic PD tremor is a 4-6 Hz resting 'pill-rolling' tremor that reduces with voluntary movement — distinguish from the higher-frequency, action-provoked tremor of essential tremor." />
    </>
  ),
  [neuroId("Parkinson's Disease", "Postural instability (pull test)")]: (d, set) => (
    <SelectField
      label="Pull test result"
      type="single"
      options={["Recovers independently (normal)", "Retropulsion, recovers without help", "Retropulsion, would fall without catching", "Unable to stand for test"]}
      value={d.pullTest}
      onChange={(v) => set("pullTest", v)}
      info={condInfo("Parkinson's Disease", "Postural instability (pull test)")}
    />
  ),
  [neuroId("Parkinson's Disease", "Freezing of gait")]: (d, set) => (
    <SelectField label="Freezing episodes" type="multi" options={["None observed", "On initiation", "On turning", "At doorways / narrow spaces", "On approaching destination", "With dual-tasking"]} value={d.freezing} onChange={(v) => set("freezing", v)} info={condInfo("Parkinson's Disease", "Freezing of gait")} />
  ),
  [neuroId("Parkinson's Disease", "Turning / axial rotation")]: (d, set) => (
    <SelectField label="Turning strategy" type="single" options={["En-bloc (multiple small steps)", "Normal pivot turn", "Requires multiple attempts", "Freezing on turn"]} value={d.turning} onChange={(v) => set("turning", v)} info={condInfo("Parkinson's Disease", "Turning / axial rotation")} />
  ),
  [neuroId("Parkinson's Disease", "Dual-task gait")]: (d, set) => (
    <TextArea label="Dual-task gait findings" value={d.dualTask} onChange={(v) => set("dualTask", v)} placeholder="e.g. gait speed/step length change while counting backward or carrying a tray..." info={condInfo("Parkinson's Disease", "Dual-task gait")} />
  ),
  [neuroId("Parkinson's Disease", "Hoehn & Yahr staging")]: (d, set) => (
    <SelectField
      label="Hoehn & Yahr stage"
      type="single"
      options={["I - Unilateral involvement only", "II - Bilateral involvement, no balance impairment", "III - Mild-moderate bilateral disease, postural instability, physically independent", "IV - Severe disability, still able to walk/stand unassisted", "V - Wheelchair bound or bedridden unless aided"]}
      value={d.hoehnYahr}
      onChange={(v) => set("hoehnYahr", v)}
      info={condInfo("Parkinson's Disease", "Hoehn & Yahr staging")}
    />
  ),

  /* ---------------- Spinal Cord Injury ---------------- */
  [neuroId("Spinal Cord Injury", "Neurological level of injury")]: (d, set) => (
    <TextField label="Neurological level of injury" value={d.nli} onChange={(v) => set("nli", v)} placeholder="e.g. C6 (ASIA)" info={condInfo("Spinal Cord Injury", "Neurological level of injury")} />
  ),
  [neuroId("Spinal Cord Injury", "Myotome grading (ASIA key muscles)")]: (d, set) => (
    <LRGrid
      label="Key myotomes (MMT 0-5)"
      rows={["C5 Elbow flexors", "C6 Wrist extensors", "C7 Elbow extensors", "C8 Finger flexors", "T1 Finger abductors", "L2 Hip flexors", "L3 Knee extensors", "L4 Ankle dorsiflexors", "L5 Great toe extensors", "S1 Ankle plantarflexors"]}
      options={["5", "4", "3", "2", "1", "0"]}
      value={d.myotomes || {}}
      onChange={(v) => set("myotomes", v)}
      info={condInfo("Spinal Cord Injury", "Myotome grading (ASIA key muscles)")}
      rowInfo={{
        "C5 Elbow flexors": neuroExamLibraryData["myoC5 Elbow flexors"],
        "C6 Wrist extensors": neuroExamLibraryData["myoC6 Wrist extensors"],
        "C7 Elbow extensors": neuroExamLibraryData["myoC7 Elbow extensors"],
        "C8 Finger flexors": neuroExamLibraryData["myoC8 Finger flexors"],
        "T1 Finger abductors": neuroExamLibraryData["myoT1 Finger abductors"],
        "L2 Hip flexors": neuroExamLibraryData["myoL2 Hip flexors"],
        "L3 Knee extensors": neuroExamLibraryData["myoL3 Knee extensors"],
        "L4 Ankle dorsiflexors": neuroExamLibraryData["myoL4 Ankle dorsiflexors"],
        "L5 Great toe extensors": neuroExamLibraryData["myoL5 Great toe extensors"],
        "S1 Ankle plantarflexors": neuroExamLibraryData["myoS1 Ankle plantarflexors"],
      }}
    />
  ),
  [neuroId("Spinal Cord Injury", "Dermatome grading (ASIA sensory)")]: (d, set) => (
    <LRGrid
      label="Key sensory points (0-2)"
      rows={["C5", "C6", "C7", "C8", "T1", "T4 (nipple)", "T10 (umbilicus)", "L3", "L4", "L5", "S1", "S4-5 (perianal)"]}
      options={["2 - Normal", "1 - Altered", "0 - Absent"]}
      value={d.dermatomes || {}}
      onChange={(v) => set("dermatomes", v)}
      info={condInfo("Spinal Cord Injury", "Dermatome grading (ASIA sensory)")}
      rowInfo={{
        "C5": neuroExamLibraryData.dermC5,
        "C6": neuroExamLibraryData.dermC6,
        "C7": neuroExamLibraryData.dermC7,
        "C8": neuroExamLibraryData.dermC8,
        "T1": neuroExamLibraryData.dermT1,
        "T4 (nipple)": neuroExamLibraryData["dermT4 (nipple)"],
        "T10 (umbilicus)": neuroExamLibraryData["dermT10 (umbilicus)"],
        "L3": neuroExamLibraryData.dermL3,
        "L4": neuroExamLibraryData.dermL4,
        "L5": neuroExamLibraryData.dermL5,
        "S1": neuroExamLibraryData.dermS1,
        "S4-5 (perianal)": neuroExamLibraryData["dermS4-5 (perianal)"],
      }}
    />
  ),
  [neuroId("Spinal Cord Injury", "ASIA Impairment Scale (AIS)")]: (d, set) => (
    <SelectField
      label="AIS grade"
      type="single"
      options={[
        "A - Complete (no motor or sensory function in S4-5)",
        "B - Sensory incomplete (sensory but not motor preserved below level, incl. S4-5)",
        "C - Motor incomplete (<50% of key muscles below level grade ≥3)",
        "D - Motor incomplete (≥50% of key muscles below level grade ≥3)",
        "E - Normal motor and sensory function",
      ]}
      value={d.ais}
      onChange={(v) => set("ais", v)}
      info={condInfo("Spinal Cord Injury", "ASIA Impairment Scale (AIS)")}
    />
  ),
  [neuroId("Spinal Cord Injury", "Sitting balance (SCI)")]: (d, set) => (
    <>
      <SelectField label="Static sitting balance" type="single" options={BALANCE_GRADES} value={d.sitStatic} onChange={(v) => set("sitStatic", v)} info={condInfo("Spinal Cord Injury", "Sitting balance (SCI)")} />
      <SelectField label="Dynamic sitting balance" type="single" options={BALANCE_GRADES} value={d.sitDynamic} onChange={(v) => set("sitDynamic", v)} />
    </>
  ),
  [neuroId("Spinal Cord Injury", "Transfer ability")]: (d, set) => (
    <SelectField label="Transfer level" type="single" options={["Independent", "Modified independent (equipment)", "Supervision", "Minimal assist", "Moderate assist", "Maximal assist / dependent", "Requires hoist/lift"]} value={d.transfer} onChange={(v) => set("transfer", v)} info={condInfo("Spinal Cord Injury", "Transfer ability")} />
  ),
  [neuroId("Spinal Cord Injury", "Wheelchair mobility")]: (d, set) => (
    <>
      <SelectField label="Wheelchair type" type="single" options={["Manual", "Power", "Not yet indicated"]} value={d.wcType} onChange={(v) => set("wcType", v)} info={condInfo("Spinal Cord Injury", "Wheelchair mobility")} />
      <SelectField label="Propulsion / mobility level" type="single" options={["Independent indoors and outdoors", "Independent indoors only", "Requires assistance", "Dependent"]} value={d.wcMobility} onChange={(v) => set("wcMobility", v)} />
    </>
  ),
  [neuroId("Spinal Cord Injury", "Autonomic dysreflexia screen")]: (d, set) => (
    <>
      <SelectField label="Signs present" type="multi" options={["None", "Sudden hypertension", "Pounding headache", "Flushing above level of injury", "Sweating above level", "Bradycardia", "Blurred vision", "Nasal congestion"]} value={d.adSigns} onChange={(v) => set("adSigns", v)} info={condInfo("Spinal Cord Injury", "Autonomic dysreflexia screen")} />
      <TextField label="Suspected trigger" value={d.adTrigger} onChange={(v) => set("adTrigger", v)} placeholder="e.g. distended bladder, bowel impaction" />
    </>
  ),

  /* ---------------- Multiple Sclerosis ---------------- */
  [neuroId("Multiple Sclerosis", "Fatigue screen")]: (d, set) => (
    <ScaleField label="Fatigue severity (0-10)" value={d.fatigue} onChange={(v) => set("fatigue", v)} info={condInfo("Multiple Sclerosis", "Fatigue screen")} />
  ),
  [neuroId("Multiple Sclerosis", "Nystagmus / INO screen")]: (d, set) => (
    <SelectField label="Eye movement findings" type="multi" options={["Normal", "Nystagmus present", "Internuclear ophthalmoplegia (INO)", "Diplopia reported"]} value={d.eyeFindings} onChange={(v) => set("eyeFindings", v)} info={condInfo("Multiple Sclerosis", "Nystagmus / INO screen")} />
  ),
  [neuroId("Multiple Sclerosis", "Lhermitte's sign")]: (d, set) => (
    <SelectField label="Lhermitte's sign" type="single" options={["Negative", "Positive - electric shock sensation down spine/limbs on neck flexion", "Not tested"]} value={d.lhermitte} onChange={(v) => set("lhermitte", v)} info={condInfo("Multiple Sclerosis", "Lhermitte's sign")} />
  ),
  [neuroId("Multiple Sclerosis", "Uhthoff's phenomenon")]: (d, set) => (
    <SelectField label="Uhthoff's phenomenon" type="single" options={["Not reported", "Reported - symptoms worsen with heat/exertion, resolve on cooling", "Not tested"]} value={d.uhthoff} onChange={(v) => set("uhthoff", v)} info={condInfo("Multiple Sclerosis", "Uhthoff's phenomenon")} />
  ),
  [neuroId("Multiple Sclerosis", "EDSS staging")]: (d, set) => (
    <TextField label="EDSS score" value={d.edss} onChange={(v) => set("edss", v)} placeholder="0.0 - 10.0" info={condInfo("Multiple Sclerosis", "EDSS staging")} />
  ),
  [neuroId("Multiple Sclerosis", "Bladder / bowel function")]: (d, set) => (
    <SelectField label="Bladder/bowel" type="multi" options={["Normal", "Urgency", "Frequency", "Incontinence", "Retention", "Constipation", "Bowel incontinence", "Catheter in situ"]} value={d.bladderBowel} onChange={(v) => set("bladderBowel", v)} info={condInfo("Multiple Sclerosis", "Bladder / bowel function")} />
  ),

  /* ---------------- Traumatic Brain Injury ---------------- */
  [neuroId("Traumatic Brain Injury", "Rancho Los Amigos level")]: (d, set) => (
    <SelectField
      label="Rancho Los Amigos LOCF"
      type="single"
      options={["I - No response", "II - Generalised response", "III - Localised response", "IV - Confused/agitated", "V - Confused, inappropriate", "VI - Confused, appropriate", "VII - Automatic, appropriate", "VIII - Purposeful, appropriate"]}
      value={d.rancho}
      onChange={(v) => set("rancho", v)}
      info={condInfo("Traumatic Brain Injury", "Rancho Los Amigos level")}
    />
  ),
  [neuroId("Traumatic Brain Injury", "Post-traumatic amnesia screen")]: (d, set) => (
    <>
      <SelectField label="Currently in PTA" type="single" options={["Yes", "No", "Unclear"]} value={d.pta} onChange={(v) => set("pta", v)} info={condInfo("Traumatic Brain Injury", "Post-traumatic amnesia screen")} />
      <TextField label="Orientation/memory notes" value={d.ptaNotes} onChange={(v) => set("ptaNotes", v)} placeholder="e.g. repeats questions, disoriented to day" />
    </>
  ),
  [neuroId("Traumatic Brain Injury", "Agitation / behaviour screen")]: (d, set) => (
    <SelectField label="Behaviour observed" type="multi" options={["Calm/cooperative", "Restless", "Agitated", "Aggressive", "Disinhibited", "Perseverative", "Impulsive"]} value={d.behaviour} onChange={(v) => set("behaviour", v)} info={condInfo("Traumatic Brain Injury", "Agitation / behaviour screen")} />
  ),

  /* ---------------- Vestibular ---------------- */
  [neuroId("Vestibular Disorders", "Dix-Hallpike test")]: (d, set) => (
    <>
      <SelectField label="Result" type="single" options={["Negative bilaterally", "Positive right (posterior canal)", "Positive left (posterior canal)", "Not performed - contraindicated"]} value={d.dixHallpike} onChange={(v) => set("dixHallpike", v)} info={condInfo("Vestibular Disorders", "Dix-Hallpike test")} />
      <TextField label="Nystagmus description" value={d.dhNystagmus} onChange={(v) => set("dhNystagmus", v)} placeholder="Direction, latency, duration, fatigability" />
    </>
  ),
  [neuroId("Vestibular Disorders", "Head impulse test")]: (d, set) => (
    <SelectField
      label="Head impulse test (HIT)"
      type="single"
      options={["Normal - no catch-up saccade", "Abnormal right - catch-up saccade", "Abnormal left - catch-up saccade", "Not performed"]}
      value={d.hit}
      onChange={(v) => set("hit", v)}
      info={condInfo("Vestibular Disorders", "Head impulse test")}
    />
  ),
  [neuroId("Vestibular Disorders", "Nystagmus assessment")]: (d, set) => (
    <SelectField label="Spontaneous nystagmus" type="multi" options={["None", "Horizontal", "Vertical", "Torsional", "Direction-changing", "Gaze-evoked"]} value={d.nystagmus} onChange={(v) => set("nystagmus", v)} info={condInfo("Vestibular Disorders", "Nystagmus assessment")} />
  ),
  [neuroId("Vestibular Disorders", "Dynamic Gait Index")]: (d, set) => (
    <>
      <NumberField label="DGI score" value={d.dgi} onChange={(v) => set("dgi", v)} unit="/24" info={condInfo("Vestibular Disorders", "Dynamic Gait Index")} />
    </>
  ),
  [neuroId("Vestibular Disorders", "Dizziness Handicap Inventory screen")]: (d, set) => (
    <TextField label="DHI score / summary" value={d.dhi} onChange={(v) => set("dhi", v)} placeholder="0-100 (higher = greater self-perceived handicap)" info={condInfo("Vestibular Disorders", "Dizziness Handicap Inventory screen")} />
  ),

  /* ---------------- Neuro-Respiratory ---------------- */
  [neuroId("Neuro-Respiratory", "Respiratory status")]: (d, set) => (
    <>
      <div className="vitals-grid">
        <NumberField label="Respiratory rate" value={d.rr} onChange={(v) => set("rr", v)} unit="/min" width="45%" info={condInfo("Neuro-Respiratory", "Respiratory status")} />
        <NumberField label="SpO2" value={d.spo2} onChange={(v) => set("spo2", v)} unit="%" width="45%" />
        <NumberField label="Chest expansion" value={d.chestExpansion} onChange={(v) => set("chestExpansion", v)} unit="cm" width="45%" />
      </div>
      <SelectField label="Respiratory muscle strength" type="single" options={["Not assessed", "Normal", "Reduced - accessory muscle use noted", "Severely reduced - ventilator dependent"]} value={d.respMuscle} onChange={(v) => set("respMuscle", v)} />
    </>
  ),
  [neuroId("Neuro-Respiratory", "Cough effectiveness")]: (d, set) => (
    <SelectField label="Cough effectiveness" type="single" options={["Strong/effective", "Weak but functional", "Ineffective - unable to clear secretions", "Absent"]} value={d.cough} onChange={(v) => set("cough", v)} info={condInfo("Neuro-Respiratory", "Cough effectiveness")} />
  ),
  [neuroId("Neuro-Respiratory", "Breathing pattern")]: (d, set) => (
    <SelectField label="Breathing pattern" type="multi" options={["Normal/diaphragmatic", "Paradoxical (abdominal)", "Accessory muscle dominant", "Shallow", "Irregular/ataxic breathing"]} value={d.breathingPattern} onChange={(v) => set("breathingPattern", v)} info={condInfo("Neuro-Respiratory", "Breathing pattern")} />
  ),
  [neuroId("Neuro-Respiratory", "Secretion assessment")]: (d, set) => (
    <SelectField label="Secretions" type="single" options={["None/minimal", "Present - patient clearing independently", "Present - requires assistance to clear", "Copious - suction required"]} value={d.secretions} onChange={(v) => set("secretions", v)} info={condInfo("Neuro-Respiratory", "Secretion assessment")} />
  ),

  /* ---------------- Communication / Bulbar ---------------- */
  [neuroId("Communication / Bulbar", "Dysarthria screen")]: (d, set) => (
    <SelectField label="Speech quality" type="multi" options={["Clear/normal", "Slurred", "Slow/effortful", "Hypophonic (quiet)", "Nasal quality", "Not assessable"]} value={d.dysarthria} onChange={(v) => set("dysarthria", v)} info={condInfo("Communication / Bulbar", "Dysarthria screen")} />
  ),
  [neuroId("Communication / Bulbar", "Voice / speech intelligibility")]: (d, set) => (
    <SelectField label="Intelligibility" type="single" options={["Fully intelligible", "Intelligible with effort/context", "Intelligible only to familiar listeners", "Unintelligible"]} value={d.intelligibility} onChange={(v) => set("intelligibility", v)} info={condInfo("Communication / Bulbar", "Voice / speech intelligibility")} />
  ),
  [neuroId("Communication / Bulbar", "Swallowing screen")]: (d, set) => (
    <>
      <SelectField label="Bedside swallow observation" type="multi" options={["No overt signs", "Coughing with intake", "Wet/gurgly voice after swallow", "Delayed swallow initiation", "Drooling", "Not yet screened"]} value={d.swallowSigns} onChange={(v) => set("swallowSigns", v)} info={condInfo("Communication / Bulbar", "Swallowing screen")} />
      <TextField label="Referral status" value={d.swallowReferral} onChange={(v) => set("swallowReferral", v)} placeholder="e.g. Referred to SLP, pending review" />
    </>
  ),

  /* ---------------- Peripheral Nerve ---------------- */
  [neuroId("Peripheral Nerve", "Neurodynamic / neural mobility testing")]: (d, set) => (
    <SelectField label="Neurodynamic test result" type="multi" options={["Not tested", "SLR - negative", "SLR - positive/reproduces symptoms", "Upper limb tension test - negative", "Upper limb tension test - positive", "Slump test - positive"]} value={d.neurodynamic} onChange={(v) => set("neurodynamic", v)} info={condInfo("Peripheral Nerve", "Neurodynamic / neural mobility testing")} />
  ),
  [neuroId("Peripheral Nerve", "Tinel's sign")]: (d, set) => (
    <TextField label="Tinel's sign" value={d.tinels} onChange={(v) => set("tinels", v)} placeholder="e.g. Positive over carpal tunnel, reproduces median distribution tingling" info={condInfo("Peripheral Nerve", "Tinel's sign")} />
  ),
  [neuroId("Peripheral Nerve", "Muscle wasting")]: (d, set) => (
    <TextArea label="Muscle wasting / atrophy" value={d.wasting} onChange={(v) => set("wasting", v)} placeholder="Location and distribution, e.g. thenar wasting suggesting median nerve involvement" info={condInfo("Peripheral Nerve", "Muscle wasting")} />
  ),
  [neuroId("Peripheral Nerve", "Peripheral sensory/motor distribution")]: (d, set) => (
    <TextArea label="Distribution pattern" value={d.peripheralDistribution} onChange={(v) => set("peripheralDistribution", v)} placeholder="Dermatomal vs. peripheral nerve territory vs. glove-and-stocking (polyneuropathy)..." info={condInfo("Peripheral Nerve", "Peripheral sensory/motor distribution")} />
  ),

  /* ---------------- Ataxia ---------------- */
  [neuroId("Ataxia", "SARA (Scale for Assessment and Rating of Ataxia)")]: (d, set) => (
    <NumberField label="SARA total" value={d.sara} onChange={(v) => set("sara", v)} unit="/40" info={condInfo("Ataxia", "SARA (Scale for Assessment and Rating of Ataxia)")} />
  ),
  [neuroId("Ataxia", "Truncal ataxia screen")]: (d, set) => (
    <SelectField label="Truncal control" type="single" options={["Normal", "Mild sway/instability", "Marked truncal ataxia - unable to sit unsupported"]} value={d.truncalAtaxia} onChange={(v) => set("truncalAtaxia", v)} info={condInfo("Ataxia", "Truncal ataxia screen")} />
  ),
};

/* Modal to add condition-specific items to the assessment */
function AddAssessmentModal({ addedIds, onToggle, onClose }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  return (
    <div className="ct-modal">
      <div className="ct-modal-header">
        <div className="ct-modal-title">🧠 Add Neuro Assessment</div>
        <button type="button" className="ct-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="ct-search-wrap">
        <input className="ct-search" placeholder="🔍 Search assessment..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="ct-modal-body">
        {NEURO_LIBRARY.map((group) => {
          const items = query ? group.items.filter((it) => it.toLowerCase().includes(query)) : group.items;
          if (!items.length) return null;
          return (
            <div className="ct-group" key={group.cat}>
              <div className="ct-group-title">
                {group.icon} {group.cat.toUpperCase()}
              </div>
              {items.map((label) => {
                const id = neuroId(group.cat, label);
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

/* Content editor for a library item added to the assessment */
function CustomSection({ id, meta, data, setData }) {
  const [d, set] = useSectionData(data, setData, id);
  const renderer = NEURO_RENDERERS[id];
  return (
    <>
      <SectionIntro icon={meta.icon} title={meta.label} sub="Added from the condition-specific neuro library." />
      {renderer ? renderer(d, set) : null}
      <TextArea label="Notes" value={d.notes} onChange={(v) => set("notes", v)} placeholder="Additional findings..." />
    </>
  );
}

/* ============================================================
   SECTION CONTENT — the core neuro examination (O'Sullivan
   examination-domain order: cognition → cranial nerves →
   sensory → motor → tone/reflexes → coordination → balance →
   gait → function)
   ============================================================ */
function useSectionData(data, setData, key) {
  const section = data[key] || {};
  const set = (field, value) => setData((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  return [section, set];
}

/* ---------- Demographics ---------- */
function DemographicsSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "demographics");
  return (
    <>
      <SectionIntro icon="📋" title="Patient Information" />
      <div className="row-2">
        <div style={{ flex: 2 }}>
          <TextField label="Patient name" value={d.name} onChange={(v) => set("name", v)} />
        </div>
        <div style={{ flex: 1 }}>
          <TextField label="Age" value={d.age} onChange={(v) => set("age", v)} />
        </div>
      </div>
      <div className="row-2">
        <div style={{ flex: 1 }}>
          <Segmented label="Gender" options={["Male", "Female", "Other"]} value={d.gender} onChange={(v) => set("gender", v)} />
        </div>
      </div>
      <TextField label="Address" value={d.address} onChange={(v) => set("address", v)} placeholder="City / locality" />
      <Segmented label="Dominance" options={["Right", "Left"]} value={d.dominance} onChange={(v) => set("dominance", v)} />
      <TextField label="Occupation" value={d.occupation} onChange={(v) => set("occupation", v)} placeholder="e.g. Farmer, office work" />
      <TextField label="Referring doctor" value={d.referrer} onChange={(v) => set("referrer", v)} />
      <SelectField
        label="Source of referral"
        type="single"
        options={["Self", "Neurologist", "Neurosurgeon", "Physician", "Orthopaedic surgeon", "Post-surgical team", "Other"]}
        value={d.referralSource}
        onChange={(v) => set("referralSource", v)}
      />
      <TextField label="Diagnosis" value={d.diagnosis} onChange={(v) => set("diagnosis", v)} placeholder="Working / referral diagnosis" />
      <TextField label="Date of onset / injury" value={d.onsetDate} onChange={(v) => set("onsetDate", v)} />
      <TextField label="Hospital / file number" value={d.hospNo} onChange={(v) => set("hospNo", v)} />
    </>
  );
}

/* ---------- Safety / Medical Stability ---------- */
const RED_FLAG_SX = ["No red flags", "New/worsening headache", "Decreased level of consciousness", "New seizure activity", "Sudden severe weakness", "New speech/facial changes (FAST)", "Signs of raised ICP (vomiting, visual change)", "Suspected DVT (calf pain/swelling)"];
const AD_SX = ["No signs", "Sudden hypertension", "Pounding headache", "Flushing/sweating above lesion", "Bradycardia"];

function SafetySection({ data, setData, setting }) {
  const [d, set] = useSectionData(data, setData, "safety");
  const isICU = setting === "icu";
  const flagCount = useMemo(() => {
    const all = [d.redFlags, d.ad].filter(Boolean).flatMap((s) => String(s).split(", ").filter(Boolean));
    return all.filter((x) => !x.startsWith("No ")).length;
  }, [d.redFlags, d.ad]);
  return (
    <>
      <SectionIntro icon="🚨" title="Safety / Medical Stability" sub="Screen for red flags and confirm the patient is stable enough to proceed." />
      {flagCount > 0 && <Alert tone="red">⚠️ {flagCount} red-flag item(s) selected — correlate clinically / notify the medical team before continuing.</Alert>}
      {isICU && (
        <>
          <SelectField label="Hemodynamic / respiratory stability" type="single" options={["Stable", "Unstable", "Labile"]} value={d.stability} onChange={(v) => set("stability", v)} />
          <TextField label="Activity restrictions" value={d.activityRestrictions} onChange={(v) => set("activityRestrictions", v)} placeholder="e.g. HOB <30°, bed rest only, per medical order" />
        </>
      )}
      <SelectField
        label="Neurological red flags"
        type="multi"
        options={RED_FLAG_SX}
        value={d.redFlags}
        onChange={(v) => set("redFlags", v)}
        howTo="A new focal deficit, sudden severe headache ('worst headache of life'), reduced GCS, or new seizure needs urgent medical review before any exertional or provocative testing."
      />
      <SelectField label="Autonomic dysreflexia signs (if SCI ≥T6)" type="multi" options={AD_SX} value={d.ad} onChange={(v) => set("ad", v)} howTo="Check for a triggering stimulus — full bladder or bowel impaction is the most common cause — and treat as a medical emergency if suspected." />
      <SelectField label="Seizure precautions in place" type="single" options={["Not applicable", "Yes - precautions active", "History of seizures, no current precautions"]} value={d.seizurePrecautions} onChange={(v) => set("seizurePrecautions", v)} />
      <SelectField
        label="Swallow / aspiration status"
        type="single"
        options={["Not yet screened", "Cleared for oral intake", "Nil by mouth", "Modified diet/thickened fluids", "NG/PEG feeding"]}
        value={d.swallow}
        onChange={(v) => set("swallow", v)}
        howTo="Do not proceed with upright/exertional work without checking swallow and aspiration status first if it hasn't been screened — this affects positioning and rest breaks."
      />
      <SelectField label="Lines / tubes / drains" type="multi" options={["None", "IV line", "Urinary catheter", "NG tube", "Tracheostomy", "Ventriculostomy/EVD", "Wound drain", "Chest drain"]} value={d.lines} onChange={(v) => set("lines", v)} />
      <SelectField label="Weight-bearing / surgical precautions" type="single" options={["Not applicable", "Full weight bearing", "Partial weight bearing", "Non weight bearing", "Per neurosurgical precautions (specify in notes)"]} value={d.wbStatus} onChange={(v) => set("wbStatus", v)} />
      <TextArea label="Additional safety notes" value={d.notes} onChange={(v) => set("notes", v)} />
    </>
  );
}

/* ---------- Subjective ---------- */
const CHIEF_COMPLAINTS_N = ["Weakness", "Numbness / altered sensation", "Balance difficulty", "Falls", "Difficulty walking", "Coordination difficulty", "Speech difficulty", "Memory / cognitive concerns", "Dizziness / vertigo", "Fatigue", "Pain", "Other"];
const ONSETS_N = ["Sudden", "Gradual", "Insidious/progressive", "Post-surgical", "Post-traumatic", "Relapsing-remitting"];

function SubjectiveSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "subjective");
  return (
    <>
      <SectionIntro icon="🗣️" title="Subjective Assessment" sub="Start open-ended, then narrow the focus as the interview progresses." />
      <SelectField
        label="Chief complaint"
        type="multi"
        options={CHIEF_COMPLAINTS_N}
        value={d.chiefComplaint}
        onChange={(v) => set("chiefComplaint", v)}
        howTo="Begin with an open question — 'what troubles you most?' — and let the patient (or family/caregiver if communication is impaired) lead before narrowing to focused follow-ups."
      />
      <TextArea
        label="History of presenting condition"
        value={d.hpc}
        onChange={(v) => set("hpc", v)}
        placeholder="Onset, course, prior treatment, hospital course..."
        howTo="Work through: Onset, course since onset (improving/plateaued/declining), prior/current treatment, relevant investigations, and the patient's own account of what changed and when."
      />
      <SelectField label="Onset" type="single" options={ONSETS_N} value={d.onset} onChange={(v) => set("onset", v)} />
      <SelectField label="Prior level of function" type="multi" options={["Fully independent", "Used a walking aid", "Required some assistance", "Wheelchair dependent", "Bed-bound"]} value={d.priorFunction} onChange={(v) => set("priorFunction", v)} />
      <TextArea label="Home / social situation" value={d.homeSituation} onChange={(v) => set("homeSituation", v)} placeholder="Stairs, who lives with patient, primary caregiver, accessibility..." />
      <SelectField label="Bladder / bowel changes" type="multi" options={["No change", "Urgency", "Frequency", "Incontinence", "Retention", "Constipation"]} value={d.bladderBowel} onChange={(v) => set("bladderBowel", v)} />
      <SelectField label="Cognitive/communication concerns (patient or family report)" type="multi" options={["None reported", "Memory difficulty", "Word-finding difficulty", "Slowed thinking", "Confusion", "Personality/behaviour change"]} value={d.cogConcerns} onChange={(v) => set("cogConcerns", v)} />
      <TextArea label="Pain" value={d.pain} onChange={(v) => set("pain", v)} placeholder="Location, character (e.g. burning/shooting suggests neuropathic), aggravating/easing factors..." />
      <TextArea label="Patient goals" value={d.goals} onChange={(v) => set("goals", v)} placeholder="What does the patient want to be able to do?" />
    </>
  );
}

/* ---------- Medical / Chart Review ---------- */
function ChartSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "chart");
  return (
    <>
      <SectionIntro icon="🗂️" title="Medical / Chart Review" />
      <TextField label="Confirmed diagnosis" value={d.diagnosis} onChange={(v) => set("diagnosis", v)} />
      <TextArea label="Relevant imaging findings" value={d.imaging} onChange={(v) => set("imaging", v)} placeholder="CT/MRI findings, lesion site/side, level of injury..." />
      <TextArea label="Relevant past medical history" value={d.pmh} onChange={(v) => set("pmh", v)} placeholder="Hypertension, diabetes, prior stroke/TIA, cardiac disease..." />
      <SelectField
        label="Medications relevant to therapy"
        type="multi"
        options={["Anticoagulant / antiplatelet", "Antispasticity agent", "Antiepileptic", "Antihypertensive", "Sedating medication", "Antidepressant", "None noted"]}
        value={d.medications}
        onChange={(v) => set("medications", v)}
        howTo="Anticoagulants raise bruising/bleeding risk with manual techniques. Sedating medications and antihypertensives raise fall/orthostatic risk during mobility work."
      />
      <TextField label="Surgical history" value={d.surgicalHx} onChange={(v) => set("surgicalHx", v)} placeholder="e.g. craniotomy, spinal fixation, VP shunt" />
      <TextArea label="Precautions noted in chart" value={d.chartPrecautions} onChange={(v) => set("chartPrecautions", v)} />
      <SelectField label="Level of consciousness on admission" type="single" options={["Alert", "Drowsy", "Obtunded", "Comatose", "Not documented"]} value={d.locAdmission} onChange={(v) => set("locAdmission", v)} />
    </>
  );
}

/* ---------- Mental Status / Cognition ---------- */
function CognitionSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "cognition");
  const gcsEye = Number((d.gcsEye || "").match(/^\d/)?.[0] || 0);
  const gcsVerbal = Number((d.gcsVerbal || "").match(/^\d/)?.[0] || 0);
  const gcsMotor = Number((d.gcsMotor || "").match(/^\d/)?.[0] || 0);
  const gcsTotal = gcsEye + gcsVerbal + gcsMotor;
  return (
    <>
      <SectionIntro icon="🧠" title="Mental Status / Cognition" />
      <SelectField label="Level of consciousness" type="single" options={["Alert", "Drowsy", "Lethargic", "Obtunded", "Stuporous", "Comatose"]} value={d.loc} onChange={(v) => set("loc", v)} />
      <SelectField label="Eye opening (E)" type="single" options={["4 - Spontaneous", "3 - To voice", "2 - To pain", "1 - None"]} value={d.gcsEye} onChange={(v) => set("gcsEye", v)} howTo="Glasgow Coma Scale — score consciousness on every patient, not just TBI. Eye + Verbal + Motor = total /15." />
      <SelectField label="Verbal response (V)" type="single" options={["5 - Oriented", "4 - Confused", "3 - Inappropriate words", "2 - Incomprehensible sounds", "1 - None"]} value={d.gcsVerbal} onChange={(v) => set("gcsVerbal", v)} />
      <SelectField label="Motor response (M)" type="single" options={["6 - Obeys commands", "5 - Localises pain", "4 - Withdraws from pain", "3 - Abnormal flexion", "2 - Abnormal extension", "1 - None"]} value={d.gcsMotor} onChange={(v) => set("gcsMotor", v)} />
      {gcsTotal > 0 && <Hint>Total GCS: {gcsTotal}/15 {gcsTotal <= 8 ? "(severe)" : gcsTotal <= 12 ? "(moderate)" : "(mild)"}</Hint>}
      <SelectField
        label="Orientation"
        type="multi"
        options={["Oriented to person", "Oriented to place", "Oriented to time", "Oriented to situation"]}
        value={d.orientation}
        onChange={(v) => set("orientation", v)}
        howTo="Ask name, current location, date/day, and why they are here — document exactly which domains are intact rather than a global 'oriented x3/x4'."
      />
      <SelectField label="Attention" type="single" options={["Intact", "Distractible", "Unable to sustain attention", "Fluctuating"]} value={d.attention} onChange={(v) => set("attention", v)} />
      <SelectField label="Memory" type="multi" options={["Short-term intact", "Short-term impaired", "Long-term intact", "Long-term impaired", "Confabulation noted"]} value={d.memory} onChange={(v) => set("memory", v)} />
      <SelectField label="Language" type="multi" options={["Comprehension intact", "Comprehension impaired", "Expression intact", "Expression impaired (expressive aphasia)", "Naming difficulty", "Repetition impaired", "Dysarthria"]} value={d.language} onChange={(v) => set("language", v)} howTo="Expressive (Broca's) aphasia: non-fluent, effortful speech with relatively preserved comprehension. Receptive (Wernicke's) aphasia: fluent but meaningless speech with impaired comprehension." />
      <SelectField label="Praxis" type="single" options={["Normal", "Apraxia suspected — motor planning difficulty despite adequate strength/sensation"]} value={d.praxis} onChange={(v) => set("praxis", v)} />
      <TextField label="Screening tool score (MMSE / MoCA)" value={d.screenScore} onChange={(v) => set("screenScore", v)} placeholder="e.g. MoCA 22/30" />
      <TextArea label="Additional cognitive observations" value={d.notes} onChange={(v) => set("notes", v)} />
    </>
  );
}

/* ---------- Cranial Nerve Screen ---------- */
function CranialNervesSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "cranial");
  const CN_OPTS = ["Intact", "Impaired", "Absent", "Not tested"];
  return (
    <>
      <SectionIntro icon="👁️" title="Cranial Nerve Screen" sub="Quick bedside screen — refer for full assessment where a deficit is suspected." />
      <SelectField label="CN I - Olfactory (smell)" type="single" options={CN_OPTS} value={d.cn1} onChange={(v) => set("cn1", v)} info={neuroExamLibraryData.cn1} />
      <SelectField label="CN II - Optic (visual acuity/fields)" type="single" options={CN_OPTS} value={d.cn2} onChange={(v) => set("cn2", v)} info={neuroExamLibraryData.cn2} />
      <SelectField label="CN III, IV, VI - Eye movements / pupils" type="single" options={[...CN_OPTS, "Ptosis", "Diplopia", "Nystagmus"]} value={d.cn346} onChange={(v) => set("cn346", v)} info={neuroExamLibraryData.cn346} />
      <SelectField label="CN V - Trigeminal (facial sensation/jaw)" type="single" options={CN_OPTS} value={d.cn5} onChange={(v) => set("cn5", v)} info={neuroExamLibraryData.cn5} />
      <SelectField label="CN VII - Facial (symmetry)" type="single" options={[...CN_OPTS, "Central facial weakness (lower face)", "Peripheral facial weakness (whole side)"]} value={d.cn7} onChange={(v) => set("cn7", v)} info={neuroExamLibraryData.cn7} />
      <SelectField label="CN VIII - Vestibulocochlear (hearing/balance)" type="single" options={CN_OPTS} value={d.cn8} onChange={(v) => set("cn8", v)} info={neuroExamLibraryData.cn8} />
      <SelectField label="CN IX, X - Glossopharyngeal/Vagus (swallow, gag, voice)" type="single" options={[...CN_OPTS, "Dysphagia noted", "Voice change/hoarseness"]} value={d.cn910} onChange={(v) => set("cn910", v)} info={neuroExamLibraryData.cn910} />
      <SelectField label="CN XI - Accessory (shoulder shrug / head turn)" type="single" options={CN_OPTS} value={d.cn11} onChange={(v) => set("cn11", v)} info={neuroExamLibraryData.cn11} />
      <SelectField label="CN XII - Hypoglossal (tongue)" type="single" options={[...CN_OPTS, "Deviates on protrusion"]} value={d.cn12} onChange={(v) => set("cn12", v)} info={neuroExamLibraryData.cn12} />
    </>
  );
}

/* ---------- Sensory Examination ---------- */
function SensorySection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "sensory");
  return (
    <>
      <SectionIntro icon="🖐️" title="Sensory Examination" />
      <LRGrid label="Light touch" rows={["Face", "UE proximal", "UE distal", "Trunk", "LE proximal", "LE distal"]} options={SENSORY_GRADES} value={d.lightTouch || {}} onChange={(v) => set("lightTouch", v)} howTo="Use a wisp of cotton wool with the patient's eyes closed; compare side to side and ask them to say 'yes' each time they feel it." />
      <LRGrid label="Pain / pinprick" rows={["Face", "UE proximal", "UE distal", "Trunk", "LE proximal", "LE distal"]} options={SENSORY_GRADES} value={d.pinprick || {}} onChange={(v) => set("pinprick", v)} howTo="Use a disposable neuro-tip; alternate sharp/dull unpredictably and ask the patient to identify which they feel." />
      <LRGrid label="Temperature" rows={["UE", "Trunk", "LE"]} options={SENSORY_GRADES} value={d.temperature || {}} onChange={(v) => set("temperature", v)} />
      <LRGrid label="Proprioception" rows={["Fingers", "Wrist", "Toes", "Ankle"]} options={SENSORY_GRADES} value={d.proprioception || {}} onChange={(v) => set("proprioception", v)} howTo="Hold the digit by its sides, move it up/down with the patient's eyes closed, and ask them to name the direction." />
      <LRGrid label="Vibration" rows={["Wrist", "Ankle"]} options={SENSORY_GRADES} value={d.vibration || {}} onChange={(v) => set("vibration", v)} howTo="Apply a vibrating 128 Hz tuning fork over a bony prominence; ask the patient to say when the vibration stops." />
      <div className="subheading">Cortical sensation</div>
      <SelectField label="Stereognosis" type="single" options={["Intact", "Impaired", "Not testable"]} value={d.stereognosis} onChange={(v) => set("stereognosis", v)} howTo="With eyes closed, ask the patient to identify a common object placed in their hand by feel alone." />
      <SelectField label="Graphesthesia" type="single" options={["Intact", "Impaired", "Not testable"]} value={d.graphesthesia} onChange={(v) => set("graphesthesia", v)} howTo="With eyes closed, trace a number or letter on the patient's palm and ask them to identify it." />
      <SelectField label="Two-point discrimination" type="single" options={["Normal", "Impaired", "Not tested"]} value={d.twoPoint} onChange={(v) => set("twoPoint", v)} />
      <TextArea label="Additional sensory notes" value={d.notes} onChange={(v) => set("notes", v)} />
    </>
  );
}

/* ---------- Motor Examination ---------- */
function MotorSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "motor");
  return (
    <>
      <SectionIntro icon="💪" title="Motor Examination" />
      <LRGrid
        label="Manual muscle testing (MMT)"
        rows={["Shoulder flexion", "Elbow flexion", "Elbow extension", "Wrist extension", "Grip strength", "Hip flexion", "Knee extension", "Knee flexion", "Ankle dorsiflexion", "Ankle plantarflexion"]}
        options={MMT_GRADES.map((g) => g.split(" - ")[0])}
        value={d.mmt || {}}
        onChange={(v) => set("mmt", v)}
        howTo="MRC/Oxford 0-5 grading: 5 normal, 4 good (moves against some resistance), 3 fair (full range against gravity only), 2 poor (full range with gravity eliminated), 1 trace (flicker), 0 no contraction."
      />
      <SelectField label="Muscle bulk" type="single" options={["Normal", "Atrophy present", "Hypertrophy present", "Asymmetrical"]} value={d.bulk} onChange={(v) => set("bulk", v)} />
      <SelectField label="Fasciculations" type="single" options={["None", "Present"]} value={d.fasciculations} onChange={(v) => set("fasciculations", v)} />
      <SelectField label="Involuntary movements" type="multi" options={["None", "Tremor", "Chorea", "Athetosis", "Dystonia", "Myoclonus", "Tics"]} value={d.involuntary} onChange={(v) => set("involuntary", v)} />
      <TextArea label="Additional motor notes" value={d.notes} onChange={(v) => set("notes", v)} />
    </>
  );
}

/* ---------- Tone / Reflexes ---------- */
function ToneReflexSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "tone");
  return (
    <>
      <SectionIntro icon="⚡" title="Tone / Reflexes" />
      <div className="subheading">Muscle tone</div>
      <LRGrid label="Overall tone type" rows={["UE", "LE"]} options={TONE_TYPES} value={d.toneType || {}} onChange={(v) => set("toneType", v)} />
      <LRGrid
        label="Modified Ashworth Scale (spastic muscle groups)"
        rows={["Elbow flexors", "Wrist flexors", "Hip adductors", "Knee extensors", "Ankle plantarflexors"]}
        options={MAS_GRADES.map((g) => g.split(" - ")[0])}
        value={d.mas || {}}
        onChange={(v) => set("mas", v)}
        howTo="Passively move the limb through range at moderate speed and grade the resistance felt: 0 none, 1 slight catch, 1+ catch with resistance <50% range, 2 marked increase most of range, 3 considerable increase, 4 rigid."
      />
      <div className="subheading">Deep tendon reflexes</div>
      <LRGrid
        label="DTRs"
        rows={["Biceps (C5-6)", "Brachioradialis (C5-6)", "Triceps (C7-8)", "Patellar (L3-4)", "Achilles (S1-2)"]}
        options={DTR_GRADES.map((g) => g.split(" - ")[0])}
        value={d.dtr || {}}
        onChange={(v) => set("dtr", v)}
        rowInfo={{
          "Biceps (C5-6)": neuroExamLibraryData.reflexBiceps,
          "Brachioradialis (C5-6)": neuroExamLibraryData.reflexBrachioradialis,
          "Triceps (C7-8)": neuroExamLibraryData.reflexTriceps,
          "Patellar (L3-4)": neuroExamLibraryData.reflexPatellar,
          "Achilles (S1-2)": neuroExamLibraryData.reflexAchilles,
        }}
      />
      <div className="subheading">Pathological reflexes</div>
      <SelectField
        label="Plantar response (Babinski)"
        type="single"
        options={["Flexor (normal/downgoing)", "Extensor (Babinski positive/upgoing)", "Equivocal", "Absent/mute"]}
        value={d.babinski}
        onChange={(v) => set("babinski", v)}
        info={neuroExamLibraryData.babinski}
      />
      <SelectField label="Clonus" type="multi" options={["Absent", "Ankle clonus present", "Patellar clonus present", "Sustained clonus"]} value={d.clonus} onChange={(v) => set("clonus", v)} info={neuroExamLibraryData.clonus} />
      <SelectField label="Hoffmann's sign" type="single" options={["Negative", "Positive", "Not tested"]} value={d.hoffmann} onChange={(v) => set("hoffmann", v)} info={neuroExamLibraryData.hoffmann} />
    </>
  );
}

/* ---------- Coordination ---------- */
function CoordinationSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "coordination");
  return (
    <>
      <SectionIntro icon="🎯" title="Coordination" />
      <LRGrid label="Finger-to-nose" rows={["Right", "Left"]} columns={["Result"]} options={["Normal", "Dysmetria (past-pointing)", "Intention tremor", "Unable to perform"]} value={d.fingerNose || {}} onChange={(v) => set("fingerNose", v)} info={neuroExamLibraryData.fingerNose} />
      <LRGrid label="Heel-to-shin" rows={["Right", "Left"]} columns={["Result"]} options={["Normal", "Ataxic/uncoordinated", "Unable to perform"]} value={d.heelShin || {}} onChange={(v) => set("heelShin", v)} info={neuroExamLibraryData.heelShin} />
      <LRGrid label="Rapid alternating movements" rows={["Right", "Left"]} columns={["Result"]} options={["Normal", "Dysdiadochokinesia (slow/irregular)", "Unable to perform"]} value={d.ram || {}} onChange={(v) => set("ram", v)} info={neuroExamLibraryData.ram} />
      <SelectField label="Dysmetria" type="single" options={["None", "Present - overshoots target", "Present - undershoots target"]} value={d.dysmetria} onChange={(v) => set("dysmetria", v)} />
      <SelectField label="Tremor with movement" type="single" options={["None", "Intention tremor (worsens near target)", "Postural tremor", "Action tremor"]} value={d.movementTremor} onChange={(v) => set("movementTremor", v)} />
      <TextArea label="Additional coordination notes" value={d.notes} onChange={(v) => set("notes", v)} />
    </>
  );
}

/* ---------- Balance ---------- */
function BalanceSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "balance");
  return (
    <>
      <SectionIntro icon="⚖️" title="Balance" />
      <SelectField label="Static sitting balance" type="single" options={BALANCE_GRADES} value={d.sitStatic} onChange={(v) => set("sitStatic", v)} />
      <SelectField label="Dynamic sitting balance" type="single" options={BALANCE_GRADES} value={d.sitDynamic} onChange={(v) => set("sitDynamic", v)} />
      <SelectField label="Static standing balance" type="single" options={BALANCE_GRADES} value={d.standStatic} onChange={(v) => set("standStatic", v)} />
      <SelectField label="Dynamic standing balance" type="single" options={BALANCE_GRADES} value={d.standDynamic} onChange={(v) => set("standDynamic", v)} />
      <SelectField
        label="Romberg test"
        type="single"
        options={["Negative (stable, eyes closed)", "Positive (sways/loses balance, eyes closed)", "Unable to test - cannot stand feet together"]}
        value={d.romberg}
        onChange={(v) => set("romberg", v)}
        howTo="Feet together, eyes open then closed, stand close enough to catch the patient. A marked increase in sway with eyes closed (positive Romberg) suggests a proprioceptive or vestibular — not cerebellar — cause, since cerebellar ataxia is present with eyes open too."
      />
      <NumberField label="Functional Reach" value={d.functionalReach} onChange={(v) => set("functionalReach", v)} unit="cm" howTo="Distance reached forward with arm at 90° shoulder flexion without stepping or losing balance, from a fixed standing position." />
      <NumberField label="Berg Balance Scale" value={d.berg} onChange={(v) => set("berg", v)} unit="/56" howTo="14-item functional balance battery; a total score ≤45/56 is associated with increased fall risk." />
      <TextArea label="Additional balance notes" value={d.notes} onChange={(v) => set("notes", v)} />
    </>
  );
}

/* ---------- Gait Assessment ---------- */
const GAIT_PATTERNS = ["Normal", "Antalgic", "Hemiplegic", "Ataxic", "Spastic (scissoring)", "Festinating", "Shuffling", "Steppage", "Trendelenburg", "Circumduction", "Other"];

function GaitSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "gait");
  return (
    <>
      <SectionIntro icon="🚶" title="Gait Assessment" />
      <SelectField
        label="Gait pattern"
        type="single"
        options={GAIT_PATTERNS}
        value={d.pattern}
        onChange={(v) => set("pattern", v)}
        howTo="Observe from front, side and behind. Hemiplegic: circumducted stiff leg with UE flexed. Ataxic: wide-based, irregular, staggering. Spastic: scissoring from hip adductor overactivity. Festinating: short, accelerating steps typical of Parkinson's. Steppage: high-stepping to clear a foot drop. Trendelenburg: contralateral pelvic drop from hip abductor weakness."
      />
      <SelectField label="Assistive device" type="single" options={["None", "Cane", "Quad cane", "Walker/frame", "Ankle-foot orthosis (AFO)", "Parallel bars", "Wheelchair", "Other"]} value={d.device} onChange={(v) => set("device", v)} />
      <SelectField label="Level of assistance" type="single" options={["Independent", "Supervision", "Contact guard", "Minimal assist", "Moderate assist", "Maximal assist", "Unable to ambulate"]} value={d.assistanceLevel} onChange={(v) => set("assistanceLevel", v)} />
      <div className="vitals-grid">
        <NumberField label="Gait speed" value={d.gaitSpeed} onChange={(v) => set("gaitSpeed", v)} unit="m/s" width="45%" />
        <NumberField label="10-metre walk time" value={d.tenMWT} onChange={(v) => set("tenMWT", v)} unit="sec" width="45%" />
      </div>
      <TextArea label="Gait observations" value={d.observations} onChange={(v) => set("observations", v)} placeholder="Step length, cadence, base of support, foot clearance, trunk/pelvic movement, symmetry, use of assistive device..." />
    </>
  );
}

/* ---------- Functional Assessment ---------- */
function FunctionalSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "functional");
  return (
    <>
      <SectionIntro icon="🛏️" title="Functional Assessment" />
      <SelectField label="Bed mobility" type="single" options={["Independent", "Supervision", "Minimal assist", "Moderate assist", "Maximal assist", "Dependent"]} value={d.bedMobility} onChange={(v) => set("bedMobility", v)} />
      <SelectField label="Sit-to-stand transfer" type="single" options={["Independent", "Supervision", "Minimal assist", "Moderate assist", "Maximal assist", "Dependent", "Requires hoist"]} value={d.sitStand} onChange={(v) => set("sitStand", v)} />
      <SelectField label="Bed-to-chair transfer" type="single" options={["Independent", "Supervision", "Minimal assist", "Moderate assist", "Maximal assist", "Dependent", "Requires hoist"]} value={d.bedChair} onChange={(v) => set("bedChair", v)} />
      <SelectField label="Toileting / bathing" type="single" options={["Independent", "Supervision", "Minimal assist", "Moderate assist", "Maximal assist", "Dependent"]} value={d.toileting} onChange={(v) => set("toileting", v)} />
      <SelectField label="Dressing / grooming" type="single" options={["Independent", "Supervision", "Minimal assist", "Moderate assist", "Maximal assist", "Dependent"]} value={d.dressing} onChange={(v) => set("dressing", v)} />
      <SelectField label="Feeding" type="single" options={["Independent", "Supervision", "Minimal assist", "Moderate assist", "Maximal assist", "Dependent"]} value={d.feeding} onChange={(v) => set("feeding", v)} />
      <NumberField label="Barthel Index" value={d.barthel} onChange={(v) => set("barthel", v)} unit="/100" howTo="10-item ADL scale, 0 (fully dependent) to 100 (fully independent)." />
      <SelectField
        label="Modified Rankin Scale"
        type="single"
        options={["0 - No symptoms", "1 - No significant disability", "2 - Slight disability", "3 - Moderate disability", "4 - Moderately severe disability", "5 - Severe disability"]}
        value={d.mrs}
        onChange={(v) => set("mrs", v)}
      />
      <TextArea label="Additional functional notes" value={d.notes} onChange={(v) => set("notes", v)} />
    </>
  );
}

/* ---------- Outcome Measures ---------- */
function OutcomesSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "outcomes");
  return (
    <>
      <SectionIntro icon="📊" title="Outcome Measures" sub="Record whichever standardised measures are relevant to this patient." />
      <TextField label="MMSE / MoCA" value={d.cogScore} onChange={(v) => set("cogScore", v)} placeholder="e.g. MoCA 24/30" />
      <NumberField label="Berg Balance Scale" value={d.berg} onChange={(v) => set("berg", v)} unit="/56" />
      <NumberField label="Timed Up and Go (TUG)" value={d.tug} onChange={(v) => set("tug", v)} unit="sec" howTo="Stand from chair, walk 3m, turn, walk back, sit down. Over 13.5 sec is associated with increased fall risk." />
      <NumberField label="10-Metre Walk Test" value={d.tenMWT} onChange={(v) => set("tenMWT", v)} unit="sec" />
      <NumberField label="Functional Reach" value={d.functionalReach} onChange={(v) => set("functionalReach", v)} unit="cm" />
      <NumberField label="Fugl-Meyer total" value={d.fuglMeyer} onChange={(v) => set("fuglMeyer", v)} unit="/226" />
      <NumberField label="Barthel Index" value={d.barthel} onChange={(v) => set("barthel", v)} unit="/100" />
      <TextField label="Modified Rankin Scale" value={d.mrs} onChange={(v) => set("mrs", v)} placeholder="0-6" />
      <TextField label="Other outcome measure" value={d.other} onChange={(v) => set("other", v)} placeholder="Name and score" />
    </>
  );
}

/* ---------- Clinical Interpretation ---------- */
const IMPAIRMENTS = ["Muscle weakness", "Abnormal tone", "Sensory loss", "Impaired coordination", "Impaired balance", "Cognitive impairment", "Communication impairment", "Impaired gait", "Reduced endurance", "Pain"];

function InterpretationSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "interpretation");
  return (
    <>
      <SectionIntro icon="🧠" title="Clinical Interpretation" sub="Summarise findings using an impairment → activity → participation framework (ICF)." />
      <SelectField label="Key impairments (body structure/function)" type="multi" options={IMPAIRMENTS} value={d.impairments} onChange={(v) => set("impairments", v)} />
      <TextArea label="Activity limitations" value={d.activityLimitations} onChange={(v) => set("activityLimitations", v)} placeholder="What the patient cannot currently do — e.g. walk >10m unaided, dress independently..." />
      <TextArea label="Participation restrictions" value={d.participationRestrictions} onChange={(v) => set("participationRestrictions", v)} placeholder="Impact on work, home role, social activity..." />
      <TextArea label="Clinical impression / hypothesis" value={d.impression} onChange={(v) => set("impression", v)} placeholder="Likely lesion site/level, correlation between findings and diagnosis, prognostic factors..." />
      <TextArea label="Physiotherapy problem list" value={d.problemList} onChange={(v) => set("problemList", v)} />
      <TextArea label="Short and long-term goals" value={d.goals} onChange={(v) => set("goals", v)} />
    </>
  );
}

/* ---------- Precautions ---------- */
function PrecautionsSection({ data, setData, setting }) {
  const [d, set] = useSectionData(data, setData, "precautions");
  return (
    <>
      <SectionIntro icon="⚠️" title="Precautions" />
      <SelectField label="Fall risk" type="single" options={["Low", "Moderate", "High"]} value={d.fallRisk} onChange={(v) => set("fallRisk", v)} />
      <SelectField label="Seizure precautions" type="single" options={["Not applicable", "Active - pad/clear environment, supervise closely"]} value={d.seizure} onChange={(v) => set("seizure", v)} />
      <SelectField label="Aspiration / swallow precautions" type="single" options={["Not applicable", "Upright positioning required", "Modified diet/thickened fluids", "Nil by mouth"]} value={d.aspiration} onChange={(v) => set("aspiration", v)} />
      <SelectField label="DVT precautions" type="single" options={["Not applicable", "Confirmed/suspected DVT - avoid limb massage, monitor for PE signs"]} value={d.dvt} onChange={(v) => set("dvt", v)} />
      <SelectField label="Autonomic dysreflexia monitoring (SCI ≥T6)" type="single" options={["Not applicable", "Monitor BP/symptoms during treatment"]} value={d.ad} onChange={(v) => set("ad", v)} />
      <SelectField label="Skin / pressure care" type="single" options={["No issues noted", "At-risk areas identified - reposition regularly, offload during treatment"]} value={d.skin} onChange={(v) => set("skin", v)} />
      <SelectField label="Positioning / splinting" type="multi" options={["None", "Resting hand splint", "AFO", "Shoulder support/sling", "Positioning schedule in place"]} value={d.positioning} onChange={(v) => set("positioning", v)} />
      <SelectField label="Weight-bearing / surgical precautions" type="single" options={["Not applicable", "Full weight bearing", "Partial weight bearing", "Non weight bearing", "Spinal precautions (log roll, brace)"]} value={d.wb} onChange={(v) => set("wb", v)} />
      <SelectField label="Communication precautions" type="multi" options={["None", "Allow extra processing time", "Use simple/short sentences", "Use communication aid/board", "Confirm understanding before proceeding"]} value={d.communication} onChange={(v) => set("communication", v)} />
      <TextArea label="Other precautions" value={d.notes} onChange={(v) => set("notes", v)} />
    </>
  );
}

/* ============================================================
   AI TREATMENT SUGGESTIONS — evidence-linked clinical decision
   support, NOT a free-form LLM call. deriveNeuroProblems() and
   matchNeuroTreatments() below are a deterministic rule engine: they
   only read the therapist's own documented findings (Clinical
   Interpretation's "Key impairments" tags, plus a couple of derived
   flags from Functional/Gait) and select from the fixed, hand-vetted
   NEURO_TREATMENT_CATALOG (neuroTreatmentCatalog.js). Nothing here
   generates a treatment name, dosage, or citation per-request -- that
   is the only way to genuinely satisfy "never invent findings/
   citations/dosage" for a clinical-safety feature like this.
   ============================================================ */
function deriveNeuroProblems(data) {
  const problems = new Set(data.interpretation?.impairments || []);
  const f = data.functional || {};
  const transferAssist = ["Minimal assist", "Moderate assist", "Maximal assist", "Dependent", "Requires hoist"];
  if (transferAssist.includes(f.sitStand) || transferAssist.includes(f.bedChair) || transferAssist.includes(f.bedMobility)) {
    problems.add("Transfer difficulty");
  }
  const adlAssist = ["Minimal assist", "Moderate assist", "Maximal assist", "Dependent"];
  if (adlAssist.includes(f.toileting) || adlAssist.includes(f.dressing) || adlAssist.includes(f.feeding)) {
    problems.add("Reduced independence");
  }
  const g = data.gait || {};
  if (g.assistanceLevel && !["Independent", "Supervision"].includes(g.assistanceLevel)) {
    problems.add("Impaired gait");
  }
  return problems;
}

// Pulls 1-3 short "label: value" strings straight from the documented
// data for a given problem tag, so "why suggested" only ever quotes
// what the therapist actually entered.
function neuroWhyFindings(data, problem) {
  const out = [];
  const f = data.functional || {}, g = data.gait || {}, b = data.balance || {}, m = data.motor || {}, c = data.coordination || {}, t = data.tone || {}, s = data.sensory || {};
  const push = (label, val) => { if (val) out.push(`${label}: ${val}`); };
  if (problem === "Transfer difficulty") {
    push("Sit-to-stand transfer", f.sitStand);
    push("Bed-to-chair transfer", f.bedChair);
    push("Bed mobility", f.bedMobility);
  } else if (problem === "Reduced independence") {
    push("Toileting/bathing", f.toileting);
    push("Dressing/grooming", f.dressing);
    if (f.barthel) push("Barthel Index", `${f.barthel}/100`);
  } else if (problem === "Impaired gait") {
    push("Gait pattern", g.pattern);
    push("Level of assistance", g.assistanceLevel);
    if (g.gaitSpeed) push("Gait speed", `${g.gaitSpeed} m/s`);
  } else if (problem === "Impaired balance") {
    push("Standing dynamic balance", b.standDynamic);
    push("Standing static balance", b.standStatic);
    if (b.berg) push("Berg Balance Scale", `${b.berg}/56`);
  } else if (problem === "Muscle weakness") {
    // LRGrid stores flat "row__column" keys (e.g. "Knee extension__Right").
    Object.entries(m.mmt || {}).forEach(([key, grade]) => {
      if (grade && Number(grade) <= 3) out.push(`${key.replace("__", " ")} MMT: ${grade}/5`);
    });
  } else if (problem === "Impaired coordination") {
    Object.entries(c.fingerNose || {}).forEach(([key, val]) => { if (val && val !== "Normal") out.push(`Finger-to-nose (${key.replace("__", " ")}): ${val}`); });
    Object.entries(c.heelShin || {}).forEach(([key, val]) => { if (val && val !== "Normal") out.push(`Heel-to-shin (${key.replace("__", " ")}): ${val}`); });
    push("Dysmetria", c.dysmetria);
  } else if (problem === "Abnormal tone") {
    Object.entries(t.toneType || {}).forEach(([key, val]) => { if (val && val !== "Normal") out.push(`Tone (${key.replace("__", " ")}): ${val}`); });
  } else if (problem === "Sensory loss") {
    ["lightTouch", "pinprick", "proprioception"].forEach((k) => {
      const label = k === "lightTouch" ? "Light touch" : k === "pinprick" ? "Pain/pinprick" : "Proprioception";
      Object.entries(s[k] || {}).forEach(([key, grade]) => { if (grade && grade !== "Intact") out.push(`${label} (${key.replace("__", " ")}): ${grade}`); });
    });
  }
  return out.slice(0, 3);
}

function neuroPhaseForPatient(data) {
  const g = data.gait || {}, f = data.functional || {}, b = data.balance || {};
  const notIndep = (v) => v && v !== "Independent";
  if (notIndep(f.bedMobility) && notIndep(f.sitStand) && (b.sitStatic === "Poor" || b.sitStatic === "Absent")) return REHAB_PHASES.acute;
  if (g.assistanceLevel === "Independent" || g.assistanceLevel === "Supervision") return REHAB_PHASES.advanced;
  if (notIndep(f.sitStand) || notIndep(f.bedChair)) return REHAB_PHASES.early;
  return REHAB_PHASES.functional;
}

function matchNeuroTreatments(data) {
  const problems = deriveNeuroProblems(data);
  if (!problems.size) return { problems, treatments: [] };
  const phase = neuroPhaseForPatient(data);
  const matched = NEURO_TREATMENT_CATALOG.filter((t) => t.triggers.some((trig) => problems.has(trig)));
  const treatments = matched.map((t) => {
    const matchedProblem = t.triggers.find((trig) => problems.has(trig));
    const why = neuroWhyFindings(data, matchedProblem);
    return {
      ...t,
      matchedProblem,
      why,
      phase,
      evidenceRefs: t.evidence.map((id) => EVIDENCE_SOURCES[id]).filter(Boolean),
    };
  });
  // Rank by the fixed priority order of the problem each treatment was matched for.
  treatments.sort((a, b) => PROBLEM_PRIORITY_ORDER.indexOf(a.matchedProblem) - PROBLEM_PRIORITY_ORDER.indexOf(b.matchedProblem));
  return { problems, treatments };
}

function AiTreatmentCard({ t, index, selected, onToggleSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="summary-card">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: BRAND.purpleFaint, color: BRAND.purpleDark, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{String(index + 1).padStart(2, "0")}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="summary-title" style={{ marginBottom: 2 }}>{t.name}</div>
          <div style={{ fontSize: 12, color: BRAND.gray }}>{t.goal}</div>
        </div>
        <div style={{ fontSize: 12, color: BRAND.purple, flexShrink: 0 }}>{open ? "▾" : "▸"}</div>
      </div>

      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BRAND.border}` }}>
          <div style={{ fontSize: 12.5, marginBottom: 8 }}>
            <b>Why suggested:</b>{" "}
            {t.why.length ? `Suggested because ${t.why.join("; ")}.` : "Not documented — therapist assessment required."}
          </div>
          <div style={{ fontSize: 12.5, marginBottom: 8 }}><b>Phase:</b> {t.phase}</div>
          <div style={{ fontSize: 12.5, marginBottom: 8 }}><b>How:</b> {t.how}</div>
          <div style={{ fontSize: 12.5, marginBottom: 8 }}><b>Dosage:</b> {t.dosage}</div>
          <div style={{ fontSize: 12.5, marginBottom: 8 }}><b>Progression:</b> {t.progression.join(" → ")}</div>
          <div style={{ fontSize: 12.5, marginBottom: 8 }}><b>Monitor:</b> {t.monitor.join(" · ")}</div>
          <div style={{ fontSize: 12.5, marginBottom: 8 }}><b>Precautions:</b> {t.precautionsTemplate}</div>
          <div style={{ fontSize: 12.5, marginBottom: 8 }}>
            <b>Evidence ({t.evidenceRefs.length || 0}):</b>
            {t.evidenceRefs.length ? (
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {t.evidenceRefs.map((e) => (
                  <li key={e.id} style={{ marginBottom: 4 }}>
                    {e.citation} <span style={{ color: BRAND.purple, fontWeight: 700 }}>[{e.strength}]</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span> {LIMITED_EVIDENCE_NOTICE}</span>
            )}
          </div>
          <button type="button" className={selected ? "ghost-btn" : "primary-btn"} style={{ width: "100%" }} onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
            {selected ? "✓ Added to Treatment Plan" : "+ Add to Treatment Plan"}
          </button>
        </div>
      )}
    </div>
  );
}

function AiTreatmentSuggestionsSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "aiTreatment");
  const selected = Array.isArray(d.selected) ? d.selected : [];
  const { problems, treatments } = useMemo(() => matchNeuroTreatments(data), [data]);
  const toggleSelect = (id) => set("selected", selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  if (!problems.size) {
    return (
      <>
        <SectionIntro icon="✨" title="AI Treatment Suggestions" sub="Evidence-linked treatment options for your consideration — you make the final clinical decision." />
        <div className="alert alert-amber">
          Not documented — therapist assessment required. Tag this patient's <b>Key impairments</b> in Clinical Interpretation (or document Transfers/Gait assistance level) to generate suggestions.
        </div>
      </>
    );
  }

  const priorityList = PROBLEM_PRIORITY_ORDER.filter((p) => problems.has(p));

  return (
    <>
      <SectionIntro icon="✨" title="AI Treatment Suggestions" sub="Evidence-linked treatment options for your consideration — you make the final clinical decision." />
      <div className="subheading">Today's priorities</div>
      <div className="summary-card">
        {priorityList.map((p, i) => (
          <div className="summary-row" key={p}>
            <span className="summary-key">{String(i + 1).padStart(2, "0")}</span>
            <span className="summary-val">{p}</span>
          </div>
        ))}
      </div>

      <div className="subheading">{treatments.length} treatment option{treatments.length !== 1 ? "s" : ""} identified</div>
      {treatments.map((t, i) => (
        <AiTreatmentCard key={t.id} t={t} index={i} selected={selected.includes(t.id)} onToggleSelect={() => toggleSelect(t.id)} />
      ))}

      <div className="alert alert-amber" style={{ marginTop: 14 }}>
        These are suggestions for consideration, not a prescription — confirm against the patient's precautions and current presentation before proceeding.
      </div>
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
// assessment section") -- same reasoning as
// CardiopulmonaryAssessment.jsx's matching export.
export function buildNeuroAssessSteps(stepOrder, customStepsMeta = {}) {
  const order = stepOrder || ASSESS_STEPS.map((s) => s.id);
  return order.map((id) => STEP_META.find((s) => s.id === id) || { id, icon: customStepsMeta[id]?.icon || "🧠", label: customStepsMeta[id]?.label || "Assessment" });
}
// Same reasoning as CardiopulmonaryAssessment.jsx's matching export -- see
// its comment.
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
      .primary-btn { flex: 1; border: none; background: linear-gradient(90deg, ${BRAND.purple}, ${BRAND.purpleDark}); color: #fff; padding: 14px 18px; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 6px 16px rgba(108,77,255,.28); }
    `}</style>
  );
}
export function SummarySection({ setting, data, assessSteps }) {
  const settingLabel = SETTINGS.find((s) => s.id === setting)?.label || "—";
  const [copied, setCopied] = useState(false);
  const steps = assessSteps || ASSESS_STEPS;

  const exportText = useMemo(() => {
    let lines = [`NEUROLOGICAL ASSESSMENT`, `Setting: ${settingLabel}`, ""];
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
  }, [data, settingLabel, steps]);

  return (
    <>
      <SectionIntro icon="✅" title="Summary & Review" sub={settingLabel} />
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
   ENTRY FLOW — "how do you want to start?" plus the three ways
   to build a stepOrder (template / region / free pick), and
   local persistence for therapist-saved templates
   ============================================================ */
const ENTRY_MODES = [
  { id: "template", icon: "📋", label: "Use Template", desc: "Start with a ready-made neurological assessment" },
  { id: "region", icon: "🧩", label: "Build by Region", desc: "Choose the body / neurological region you want to assess" },
  { id: "individual", icon: "🧠", label: "Choose Assessments", desc: "Pick individual assessments from the Neuro library" },
  { id: "mytemplates", icon: "⭐", label: "My Templates", desc: "Your saved custom assessment workflows" },
];

const DOMAIN_STEP_IDS = ["cognition", "cranial", "sensory", "motor", "tone", "coordination", "balance", "gait", "functional", "outcomes"];
const ALWAYS_STEP_IDS = ["demographics", "safety", "subjective", "chart", "interpretation", "precautions", "aiTreatment", "summary"];
const FULL_STEP_ORDER = ASSESS_STEPS.map((s) => s.id);

function buildStepOrder(domainStepIds, customIds) {
  const domainSet = new Set(domainStepIds);
  const core = FULL_STEP_ORDER.filter((id) => ALWAYS_STEP_IDS.includes(id) || domainSet.has(id));
  const summaryIdx = core.indexOf("summary");
  const insertAt = summaryIdx === -1 ? core.length : summaryIdx;
  const next = [...core];
  next.splice(insertAt, 0, ...customIds);
  return next;
}

const REGIONS = [
  { id: "brain", icon: "🧠", label: "Brain / CNS", domainSteps: ["cognition", "cranial", "motor", "tone", "coordination"], libraryCats: [] },
  { id: "spinalcord", icon: "🦴", label: "Spinal Cord", domainSteps: ["motor", "sensory", "tone", "balance", "gait", "functional"], libraryCats: ["Spinal Cord Injury"] },
  { id: "peripheralnerve", icon: "🧬", label: "Peripheral Nerve", domainSteps: ["sensory", "motor", "tone"], libraryCats: ["Peripheral Nerve"] },
  { id: "cranialvisual", icon: "👁️", label: "Cranial / Visual", domainSteps: ["cranial"], libraryCats: [] },
  { id: "vestibular", icon: "🌀", label: "Vestibular", domainSteps: ["balance", "gait"], libraryCats: ["Vestibular Disorders"] },
  { id: "neuromuscular", icon: "💪", label: "Neuromuscular", domainSteps: ["motor", "tone", "sensory"], libraryCats: ["Neuro-Respiratory"] },
  { id: "gaitmobility", icon: "🚶", label: "Gait & Mobility", domainSteps: ["gait", "functional"], libraryCats: [] },
  { id: "balance", icon: "⚖️", label: "Balance", domainSteps: ["balance"], libraryCats: [] },
  { id: "sensory", icon: "🖐️", label: "Sensory", domainSteps: ["sensory"], libraryCats: [] },
  { id: "motor", icon: "💪", label: "Motor", domainSteps: ["motor", "tone"], libraryCats: [] },
];

const NEURO_TEMPLATES = [
  { id: "stroke", icon: "🧠", label: "Stroke", domainSteps: DOMAIN_STEP_IDS, libraryItems: [["Stroke", "Higher mental function screen"], ["Stroke", "Neglect / inattention"], ["Stroke", "Visual field screen"], ["Stroke", "Synergy pattern (UE/LE)"], ["Stroke", "Selective motor control"], ["Stroke", "Brunnstrom recovery stage"], ["Stroke", "Fugl-Meyer Assessment"], ["Stroke", "Modified Rankin Scale"]] },
  { id: "parkinsons", icon: "🌀", label: "Parkinson's", domainSteps: ["cognition", "motor", "tone", "balance", "gait", "coordination", "functional"], libraryItems: [["Parkinson's Disease", "Bradykinesia"], ["Parkinson's Disease", "Rigidity type"], ["Parkinson's Disease", "Resting tremor"], ["Parkinson's Disease", "Postural instability (pull test)"], ["Parkinson's Disease", "Freezing of gait"], ["Parkinson's Disease", "Turning / axial rotation"], ["Parkinson's Disease", "Dual-task gait"], ["Parkinson's Disease", "Hoehn & Yahr staging"]] },
  { id: "tbi", icon: "💥", label: "TBI", domainSteps: DOMAIN_STEP_IDS, libraryItems: [["Traumatic Brain Injury", "Rancho Los Amigos level"], ["Traumatic Brain Injury", "Post-traumatic amnesia screen"], ["Traumatic Brain Injury", "Agitation / behaviour screen"]] },
  { id: "sci", icon: "🦴", label: "Spinal Cord Injury", domainSteps: ["motor", "sensory", "tone", "balance", "gait", "functional"], libraryItems: [["Spinal Cord Injury", "Neurological level of injury"], ["Spinal Cord Injury", "Myotome grading (ASIA key muscles)"], ["Spinal Cord Injury", "Dermatome grading (ASIA sensory)"], ["Spinal Cord Injury", "ASIA Impairment Scale (AIS)"], ["Spinal Cord Injury", "Sitting balance (SCI)"], ["Spinal Cord Injury", "Transfer ability"], ["Spinal Cord Injury", "Wheelchair mobility"], ["Spinal Cord Injury", "Autonomic dysreflexia screen"]] },
  { id: "peripheralneuropathy", icon: "🧬", label: "Peripheral Neuropathy", domainSteps: ["sensory", "motor", "tone", "gait"], libraryItems: [["Peripheral Nerve", "Neurodynamic / neural mobility testing"], ["Peripheral Nerve", "Tinel's sign"], ["Peripheral Nerve", "Muscle wasting"], ["Peripheral Nerve", "Peripheral sensory/motor distribution"]] },
  { id: "vestibulartemplate", icon: "🌀", label: "Vestibular", domainSteps: ["cranial", "balance", "gait"], libraryItems: [["Vestibular Disorders", "Dix-Hallpike test"], ["Vestibular Disorders", "Head impulse test"], ["Vestibular Disorders", "Nystagmus assessment"], ["Vestibular Disorders", "Dynamic Gait Index"], ["Vestibular Disorders", "Dizziness Handicap Inventory screen"]] },
  { id: "ms", icon: "🔥", label: "Multiple Sclerosis", domainSteps: DOMAIN_STEP_IDS, libraryItems: [["Multiple Sclerosis", "Fatigue screen"], ["Multiple Sclerosis", "Nystagmus / INO screen"], ["Multiple Sclerosis", "Lhermitte's sign"], ["Multiple Sclerosis", "Uhthoff's phenomenon"], ["Multiple Sclerosis", "EDSS staging"], ["Multiple Sclerosis", "Bladder / bowel function"]] },
  { id: "neuromusculartemplate", icon: "💪", label: "Neuromuscular", domainSteps: ["motor", "tone", "sensory", "gait"], libraryItems: [["Peripheral Nerve", "Muscle wasting"], ["Neuro-Respiratory", "Respiratory status"], ["Neuro-Respiratory", "Cough effectiveness"]] },
  { id: "general", icon: "🧠", label: "General Neurological", domainSteps: DOMAIN_STEP_IDS, libraryItems: [] },
];

const MY_TEMPLATES_KEY = "physiomind_neuro_my_templates";
function loadMyTemplatesFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MY_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveMyTemplatesToStorage(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MY_TEMPLATES_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable/full — saved templates just won't persist */
  }
}

/* ============================================================
   MAIN APP
   ============================================================ */
// Wired into physiom's real patient records (2026-08-19), same pattern
// as CardiopulmonaryAssessment.jsx: `patientData`/`onSave` mirror
// AppFull.jsx's shared data/set, with this whole module's local `data`
// object stored under one `patientData.neuro` key (see the push-up and
// re-hydration effects below) rather than flattening every internal
// field into the shared bag -- this file owns its own deeply nested
// step/section data model, not worth rewriting.
export default function NeurologicalAssessment({ patientData, activePatientId, onSave, onNav } = {}) {
  useEffect(() => {
    // Lock the page from pinch-zoom and from iOS's auto-zoom-on-input-focus,
    // which is what causes the "whole page jumps/zooms" feeling on mobile.
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
  // directly demographic data of that template") -- Setting/Mode/Template
  // pickers are a one-time setup, not something to re-ask every time a
  // therapist reopens a patient with data already on file. "demographics"
  // is always the first entry in any built stepOrder (see
  // ALWAYS_STEP_IDS/buildStepOrder above), so jumping straight into
  // phase="assess" at step 1 always lands on Patient Information.
  const neuroSeed = patientData?.neuro || {};
  const hasExistingNeuro = Object.keys(neuroSeed).length > 0;
  const [step, setStep] = useState(() => (hasExistingNeuro ? 1 : 0));
  const [setting, setSetting] = useState(() => (hasExistingNeuro ? neuroSeed.meta?.setting || "outpatient" : null));
  const [data, setData] = useState(() => neuroSeed);
  const [visited, setVisited] = useState(new Set());
  const [stepOrder, setStepOrder] = useState(() => (hasExistingNeuro ? neuroSeed.meta?.stepOrder || FULL_STEP_ORDER : ASSESS_STEPS.map((s) => s.id)));
  const [customStepsMeta, setCustomStepsMeta] = useState(() => (hasExistingNeuro ? neuroSeed.meta?.customStepsMeta || {} : {}));
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(null);

  // phase: "setting" -> "mode" -> ("template" | "region" | "mytemplates") -> "assess"
  const [phase, setPhase] = useState(() => (hasExistingNeuro ? "assess" : "setting"));
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [myTemplates, setMyTemplates] = useState(() => loadMyTemplatesFromStorage());
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // Re-hydrate when switching to a different patient -- mirrors
  // CardiopulmonaryAssessment.jsx's own re-hydration effect. Keyed only on
  // activePatientId (not on every patientData change) so it doesn't fight
  // with the push-up effect below mid-typing.
  useEffect(() => {
    const s = patientData?.neuro || {};
    const existing = Object.keys(s).length > 0;
    setData(s);
    setStep(existing ? 1 : 0);
    setSetting(existing ? s.meta?.setting || "outpatient" : null);
    setVisited(new Set());
    setStepOrder(existing ? s.meta?.stepOrder || FULL_STEP_ORDER : ASSESS_STEPS.map((s) => s.id));
    setCustomStepsMeta(existing ? s.meta?.customStepsMeta || {} : {});
    setPhase(existing ? "assess" : "setting");
    setSelectedRegions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePatientId]);

  // The actual save: every local change gets pushed into the patient's
  // real record via the same `set()` AppFull.jsx hands every other module.
  useEffect(() => {
    onSave?.("neuro", data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Remember the chosen setting/stepOrder/customStepsMeta on the record
  // itself so re-opening this patient later (see hasExistingNeuro above)
  // can skip straight back into the same template instead of asking again.
  useEffect(() => {
    if (phase !== "assess") return;
    setData((prev) => {
      const meta = { setting, stepOrder, customStepsMeta };
      if (prev.meta && prev.meta.setting === meta.setting && prev.meta.stepOrder === meta.stepOrder && prev.meta.customStepsMeta === meta.customStepsMeta) return prev;
      return { ...prev, meta };
    });
  }, [phase, setting, stepOrder, customStepsMeta]);

  // One shared patient identity with Ortho's Demographics, not two
  // separate ones -- same reasoning as CardiopulmonaryAssessment.jsx's
  // matching effects. Seeds this screen's Patient Information step from
  // the same dem_* fields whenever this screen's own fields are still
  // blank, and mirrors edits made HERE back into those same keys.
  useEffect(() => {
    const dem = patientData || {};
    const neuroDem = data.demographics || {};
    const seeded = {
      name: neuroDem.name || dem.dem_name || "",
      age: neuroDem.age || dem.dem_age || "",
      gender: neuroDem.gender || dem.dem_sex || dem.dem_gender || "",
      address: neuroDem.address || dem.dem_address || "",
      occupation: neuroDem.occupation || dem.dem_occupation || "",
      referrer: neuroDem.referrer || dem.dem_referral_dr || dem.dem_gp || "",
      dominance: neuroDem.dominance || dem.dem_dominant || dem.dem_dominant_hand || dem.dem_hand || "",
    };
    const changed = Object.keys(seeded).some((k) => seeded[k] !== (neuroDem[k] || ""));
    if (changed) setData((prev) => ({ ...prev, demographics: { ...prev.demographics, ...seeded } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePatientId]);

  useEffect(() => {
    const neuroDem = data.demographics;
    if (!neuroDem || !onSave) return;
    if (neuroDem.name) onSave("dem_name", neuroDem.name);
    if (neuroDem.age) onSave("dem_age", neuroDem.age);
    if (neuroDem.gender) { onSave("dem_sex", neuroDem.gender); onSave("dem_gender", neuroDem.gender); }
    if (neuroDem.address) onSave("dem_address", neuroDem.address);
    if (neuroDem.occupation) onSave("dem_occupation", neuroDem.occupation);
    if (neuroDem.referrer) onSave("dem_referral_dr", neuroDem.referrer);
    if (neuroDem.dominance) onSave("dem_dominant", neuroDem.dominance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.demographics]);
  const [saveName, setSaveName] = useState("");

  const assessSteps = useMemo(
    () => stepOrder.map((id) => STEP_META.find((s) => s.id === id) || { id, icon: customStepsMeta[id]?.icon || "🧠", label: customStepsMeta[id]?.label || "Assessment" }),
    [stepOrder, customStepsMeta]
  );

  const total = 1 + assessSteps.length;
  const assessIndex = step - 1; // index within assessSteps
  const current = step < 1 ? STEP_META[0] : assessSteps[assessIndex];

  useEffect(() => {
    if (step >= 1 && current) setVisited((v) => new Set(v).add(current.id));
  }, [step, current]);

  function goNext() {
    if (step < total - 1) setStep(step + 1);
  }
  function goBack() {
    if (phase === "assess" && step === 1) {
      setPhase("mode");
      return;
    }
    if (step > 0) setStep(step - 1);
  }
  function handleBack() {
    if (phase === "mode") {
      setPhase("setting");
      return;
    }
    if (phase === "template" || phase === "region" || phase === "mytemplates") {
      setPhase("mode");
      return;
    }
    goBack();
  }
  function restart() {
    setStep(0);
    setSetting(null);
    setData({});
    setVisited(new Set());
    setStepOrder(ASSESS_STEPS.map((s) => s.id));
    setCustomStepsMeta({});
    setPhase("setting");
    setSelectedRegions([]);
  }
  function startAssessment(domainStepIds, customIds, customMeta = {}) {
    setStepOrder(buildStepOrder(domainStepIds, customIds));
    setCustomStepsMeta(customMeta);
    setVisited(new Set());
    setStep(1);
    setPhase("assess");
  }
  function useTemplate(t) {
    const customIds = t.libraryItems.map(([cat, label]) => neuroId(cat, label));
    const customMeta = {};
    t.libraryItems.forEach(([cat, label]) => {
      const g = NEURO_LIBRARY.find((x) => x.cat === cat);
      customMeta[neuroId(cat, label)] = { icon: g?.icon || "🧠", label };
    });
    startAssessment(t.domainSteps, customIds, customMeta);
  }
  function toggleRegion(id) {
    setSelectedRegions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function applyRegions() {
    const regions = REGIONS.filter((r) => selectedRegions.includes(r.id));
    const domainSteps = Array.from(new Set(regions.flatMap((r) => r.domainSteps)));
    const cats = Array.from(new Set(regions.flatMap((r) => r.libraryCats)));
    const customIds = [];
    const customMeta = {};
    cats.forEach((cat) => {
      const g = NEURO_LIBRARY.find((x) => x.cat === cat);
      if (!g) return;
      g.items.forEach((label) => {
        const id = neuroId(cat, label);
        customIds.push(id);
        customMeta[id] = { icon: g.icon, label };
      });
    });
    startAssessment(domainSteps, customIds, customMeta);
  }
  function useMyTemplate(t) {
    startAssessment(t.domainSteps, t.customIds, t.customMeta);
  }
  function deleteMyTemplate(id) {
    setMyTemplates((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveMyTemplatesToStorage(next);
      return next;
    });
  }
  function confirmSaveTemplate() {
    if (!saveName.trim()) return;
    const domainSteps = stepOrder.filter((id) => DOMAIN_STEP_IDS.includes(id));
    const customIds = stepOrder.filter((id) => id.startsWith("nx-"));
    const customMeta = {};
    customIds.forEach((id) => {
      customMeta[id] = customStepsMeta[id] || { icon: "🧠", label: "Assessment" };
    });
    const newTemplate = { id: `t-${Date.now()}`, name: saveName.trim(), domainSteps, customIds, customMeta };
    setMyTemplates((prev) => {
      const next = [...prev, newTemplate];
      saveMyTemplatesToStorage(next);
      return next;
    });
    setSaveModalOpen(false);
    setSaveName("");
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
      if (current && current.id === id) setStep((s) => Math.max(1, s - 1));
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

  return (
    <InfoCardContext.Provider value={setActiveCard}>
    <div className="app-shell">
      <style>{`
        * { box-sizing: border-box; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
        html, body { overscroll-behavior-y: contain; }
        .app-shell {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif;
          background: linear-gradient(180deg, ${BRAND.purpleFaint} 0%, #FFFFFF 220px);
          min-height: 100vh;
          color: ${BRAND.ink};
          display: flex;
          justify-content: center;
          touch-action: pan-y;
          overscroll-behavior-y: contain;
        }
        .app-inner { width: 100%; max-width: 480px; min-height: 100vh; display: flex; flex-direction: column; background: #fff; position: relative; }
        .topbar {
          position: sticky; top: 0; z-index: 20; background: #fff;
          border-bottom: 1px solid ${BRAND.border};
          padding: 14px 16px 6px;
        }
        /* Fix (2026-08-20, Aditi: "overlaping is happeining with
           neurological and cardio assessment name" then "upper area is
           blank push all above little bit") -- offset below AppFull.jsx's
           own sticky mobile header (.pm-mobile-hdr, 64px tall) instead of
           both competing for the same top:0. -28px, not +64px: sticky
           "top" here is measured from .pm-main's own padding box
           (64px header + 28px pm-main padding-top = 92px), not the visible
           viewport edge (which looks 24px higher because AppFull.jsx
           negates that padding with a -24px margin on this screen's mount
           wrapper) -- see CardiopulmonaryAssessment.jsx's matching rule
           for the full measurement. +64 pinned the bar 92+64=156px down,
           a large dead gap; -28 (92-28=64) pins it flush under the header. */
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
        .ct-search { width: 100%; border: 1.5px solid ${BRAND.border}; border-radius: 12px; padding: 10px 12px; font-size: 16px; outline: none; font-family: inherit; }
        .ct-modal-body { flex: 1; overflow-y: auto; padding: 14px 16px 16px; }
        .ct-group { margin-bottom: 20px; }
        .ct-group-title { font-weight: 700; font-size: 11.5px; color: ${BRAND.purpleDark}; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
        .ct-item { width: 100%; display: flex; align-items: center; gap: 10px; border: none; background: transparent; padding: 9px 4px; font-size: 14px; text-align: left; cursor: pointer; color: ${BRAND.ink}; border-radius: 10px; }
        .ct-item:active { background: ${BRAND.purpleFaint}; }
        .ct-item-checked { color: ${BRAND.purpleDark}; font-weight: 600; }
        .ct-checkbox { font-size: 16px; color: ${BRAND.purple}; flex-shrink: 0; }
        .ct-modal-footer { padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid ${BRAND.border}; }

        /* Extra clearance for .bottombar's switch from sticky to fixed
           below (see that rule's comment) -- bar height + physiom's own
           fixed bottom nav clearance. */
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

        .info-btn-wrap { position: relative; display: inline-flex; }
        .info-btn { border: 1px solid ${BRAND.purple}; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; padding: 3px 8px; border-radius: 999px; cursor: pointer; white-space: nowrap; }
        .info-popover { position: absolute; z-index: 40; top: calc(100% + 6px); left: 0; width: 260px; max-width: 72vw; background: ${BRAND.ink}; color: #EDEBFB; border-radius: 12px; padding: 12px 14px; font-size: 12.5px; line-height: 1.5; box-shadow: 0 10px 30px rgba(20,10,60,.3); }
        .info-popover p { margin: 0; padding-right: 14px; }
        .info-popover-close { position: absolute; top: 8px; right: 8px; border: none; background: transparent; color: #B8AEEF; font-size: 11px; cursor: pointer; }

        .text-input-wrap, .select-wrap { position: relative; display: flex; align-items: center; gap: 6px; background: #fff; border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 4px 6px 4px 12px; }
        .text-input, .select-input { flex: 1; border: none; outline: none; font-size: 16px; padding: 8px 4px; background: transparent; min-width: 0; }
        .combo-unit { font-size: 12px; color: ${BRAND.gray}; padding: 0 6px; white-space: nowrap; }
        .select-btn { flex-shrink: 0; border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.purpleDark}; font-size: 15px; font-weight: 700; padding: 8px 12px; border-radius: 10px; cursor: pointer; white-space: nowrap; }

        .select-popover { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #fff; border: 1px solid ${BRAND.border}; border-radius: 14px; box-shadow: 0 10px 28px rgba(20,10,60,.16); z-index: 35; padding: 10px; max-height: 300px; overflow-y: auto; }
        .popover-head { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: ${BRAND.gray}; margin-bottom: 8px; padding: 0 2px; }
        .popover-close { border: none; background: transparent; color: ${BRAND.grayLight}; cursor: pointer; font-size: 12px; }
        .popover-search { width: 100%; border: 1px solid ${BRAND.border}; border-radius: 10px; padding: 7px 10px; font-size: 16px; margin-bottom: 8px; outline: none; font-family: inherit; }
        .popover-list { display: flex; flex-direction: column; gap: 3px; }
        .popover-item { display: flex; justify-content: space-between; align-items: center; border: none; background: ${BRAND.purpleFaint}; color: ${BRAND.ink}; padding: 9px 10px; border-radius: 9px; font-size: 13px; text-align: left; cursor: pointer; }
        .popover-item-active { background: ${BRAND.purple}; color: #fff; font-weight: 600; }
        .popover-check { font-size: 12px; }
        .popover-done { margin-top: 8px; width: 100%; border: none; background: ${BRAND.ink}; color: #fff; padding: 9px; border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer; }

        .segmented { display: flex; background: ${BRAND.purpleFaint}; border-radius: 12px; padding: 4px; gap: 4px; }
        .seg-btn { flex: 1; border: none; background: transparent; color: ${BRAND.gray}; padding: 9px 6px; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .seg-active { background: #fff; color: ${BRAND.purple}; box-shadow: 0 1px 4px rgba(20,10,60,.12); }

        .vitals-grid { display: flex; flex-wrap: wrap; gap: 10px 12px; margin-bottom: 6px; }
        .vital-field { flex: 1 1 45%; min-width: 120px; }
        .vital-label-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .vital-label { font-size: 12px; color: ${BRAND.gray}; font-weight: 600; }
        .vital-input-wrap { display: flex; align-items: center; border: 1.5px solid ${BRAND.border}; border-radius: 12px; padding: 6px 10px; background: #fff; }
        .vital-input { border: none; outline: none; font-size: 16px; width: 100%; font-weight: 600; background: transparent; }
        .vital-unit { font-size: 11px; color: ${BRAND.grayLight}; white-space: nowrap; }

        .row-2 { display: flex; gap: 12px; align-items: flex-end; }

        .textarea { width: 100%; border: 1.5px solid ${BRAND.border}; border-radius: 14px; padding: 10px 12px; font-size: 16px; font-family: inherit; outline: none; resize: vertical; }

        .scale-wrap { display: flex; align-items: center; gap: 12px; }
        .scale-range { flex: 1; accent-color: ${BRAND.purple}; }
        .scale-readout { font-weight: 700; font-size: 15px; color: ${BRAND.purple}; min-width: 36px; text-align: right; }
        .scale-max { font-weight: 400; font-size: 11px; color: ${BRAND.grayLight}; }

        .lr-grid { border: 1.5px solid ${BRAND.border}; border-radius: 14px; overflow: hidden; }
        .lr-row { display: flex; border-bottom: 1px solid ${BRAND.border}; }
        .lr-row:last-child { border-bottom: none; }
        .lr-head { background: ${BRAND.purpleFaint}; }
        .lr-cell { flex: 1; padding: 8px 6px; font-size: 12px; display: flex; align-items: center; }
        .lr-zone { flex: 1.4; font-weight: 600; color: ${BRAND.ink}; }
        .lr-colhead { font-weight: 700; color: ${BRAND.purpleDark}; justify-content: center; }
        .lr-select { width: 100%; border: 1px solid ${BRAND.border}; border-radius: 8px; padding: 5px 4px; font-size: 11.5px; background: #fff; }

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

        /* "position: sticky" here never actually stuck -- same root cause
           as CardiopulmonaryAssessment.jsx's matching fix: none of this
           bar's real ancestors scroll themselves, so it resolved against
           physiom's own outer .pm-main container instead, whose box just
           grows to fit the whole assessment. "fixed" escapes that and
           pins to the real viewport; bottom:60px leaves clearance above
           physiom's own fixed bottom nav bar. */
        .bottombar { position: fixed; left: 50%; transform: translateX(-50%); bottom: 60px; width: 100%; max-width: 480px; z-index: 25; background: #fff; border-top: 1px solid ${BRAND.border}; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 10px; }
        .ghost-btn { flex: 0 0 auto; border: 1.5px solid ${BRAND.border}; background: #fff; color: ${BRAND.ink}; padding: 13px 18px; border-radius: 14px; font-weight: 600; font-size: 14px; cursor: pointer; }
        .primary-btn { flex: 1; border: none; background: linear-gradient(90deg, ${BRAND.purple}, ${BRAND.purpleDark}); color: #fff; padding: 14px 18px; border-radius: 14px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 6px 16px rgba(108,77,255,.28); }
        .primary-btn:disabled { opacity: .4; cursor: not-allowed; box-shadow: none; }
      `}</style>

      <div className="app-inner">
        <div className="topbar">
          <div className="topbar-row">
            {phase !== "setting" && (
              <button className="back-btn" onClick={handleBack} aria-label="Back">
                ←
              </button>
            )}
            <div>
              <div className="topbar-title">
                {phase === "setting" || phase === "mode"
                  ? "🧠 Neurological Assessment"
                  : phase === "template"
                  ? "📋 Use Template"
                  : phase === "region"
                  ? "🧩 Build by Region"
                  : phase === "mytemplates"
                  ? "⭐ My Templates"
                  : current.icon
                  ? `${current.icon} ${current.label}`
                  : current.label}
              </div>
              {phase !== "setting" && (
                <div className="topbar-breadcrumb">{SETTINGS.find((s) => s.id === setting)?.label}</div>
              )}
            </div>
            {phase === "assess" && current.id !== "summary" && (
              <button className="back-btn" onClick={() => setReviewOpen(true)} aria-label="Review filled so far" title="Review filled so far">
                ✅
              </button>
            )}
          </div>
          {phase === "assess" && (
            <>
              <div className="stepnav-wrap">
                <StepNav
                  steps={assessSteps}
                  currentIndex={assessIndex}
                  visited={visited}
                  onJump={(i) => setStep(1 + i)}
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
          {phase === "setting" && (
            <>
              <SectionIntro icon="🏥" title="Where is the patient being assessed?" sub="Select the setting, then choose how you'd like to build the exam — from a template, by region, or item by item." />
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

          {phase === "mode" && (
            <>
              <SectionIntro icon="🧠" title="How would you like to start?" sub="Templates and regions are just a starting point — you can add or remove any assessment afterward." />
              <div className="picker-grid">
                {ENTRY_MODES.map((m) => (
                  <button
                    key={m.id}
                    className="picker-card"
                    onClick={() => (m.id === "individual" ? startAssessment(DOMAIN_STEP_IDS, []) : setPhase(m.id))}
                  >
                    <div className="picker-icon">{m.icon}</div>
                    <div>
                      <div className="picker-label">{m.label}</div>
                      <div className="picker-desc">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {phase === "template" && (
            <>
              <SectionIntro icon="📋" title="Choose a template" sub="Preloads the relevant assessment cards for a condition — add or remove anything afterward." />
              <div className="picker-grid">
                {NEURO_TEMPLATES.map((t) => (
                  <button key={t.id} className="picker-card" onClick={() => useTemplate(t)}>
                    <div className="picker-icon">{t.icon}</div>
                    <div>
                      <div className="picker-label">{t.label}</div>
                      <div className="picker-desc">
                        {t.domainSteps.length} exam areas{t.libraryItems.length ? ` + ${t.libraryItems.length} condition-specific tests` : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {phase === "region" && (
            <>
              <SectionIntro icon="🧩" title="What do you want to assess?" sub="Select one or more regions/systems, then continue." />
              <div className="picker-grid">
                {REGIONS.map((r) => (
                  <button key={r.id} className={"picker-card" + (selectedRegions.includes(r.id) ? " selected" : "")} onClick={() => toggleRegion(r.id)}>
                    <div className="picker-icon">{r.icon}</div>
                    <div>
                      <div className="picker-label">{r.label}</div>
                      <div className="picker-desc">{r.domainSteps.map((id) => STEP_META.find((s) => s.id === id)?.label).join(", ")}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button type="button" className="primary-btn" style={{ marginTop: 14 }} disabled={!selectedRegions.length} onClick={applyRegions}>
                Continue with {selectedRegions.length} region{selectedRegions.length === 1 ? "" : "s"}
              </button>
            </>
          )}

          {phase === "mytemplates" && (
            <>
              <SectionIntro icon="⭐" title="My Templates" sub="Your saved custom assessment workflows." />
              {myTemplates.length === 0 ? (
                <Alert tone="amber">No saved templates yet. Build an assessment, then tap "Save this assessment as a template" from the Summary step to create one.</Alert>
              ) : (
                <div className="picker-grid">
                  {myTemplates.map((t) => (
                    <div key={t.id} className="picker-card" style={{ cursor: "default" }}>
                      <div className="picker-icon">⭐</div>
                      <div style={{ flex: 1 }}>
                        <div className="picker-label">{t.name}</div>
                        <div className="picker-desc">
                          {t.domainSteps.length} exam areas{t.customIds.length ? ` + ${t.customIds.length} extra tests` : ""}
                        </div>
                      </div>
                      <button type="button" className="ghost-btn" style={{ padding: "8px 12px" }} onClick={() => useMyTemplate(t)}>
                        Use
                      </button>
                      <button type="button" className="ghost-btn" style={{ padding: "8px 10px" }} onClick={() => deleteMyTemplate(t.id)} aria-label="Delete template">
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {phase === "assess" && (
            <>
              {current.id === "demographics" && <DemographicsSection data={data} setData={setData} />}
              {current.id === "safety" && <SafetySection data={data} setData={setData} setting={setting} />}
              {current.id === "subjective" && <SubjectiveSection data={data} setData={setData} />}
              {current.id === "chart" && <ChartSection data={data} setData={setData} />}
              {current.id === "cognition" && <CognitionSection data={data} setData={setData} />}
              {current.id === "cranial" && <CranialNervesSection data={data} setData={setData} />}
              {current.id === "sensory" && <SensorySection data={data} setData={setData} />}
              {current.id === "motor" && <MotorSection data={data} setData={setData} />}
              {current.id === "tone" && <ToneReflexSection data={data} setData={setData} />}
              {current.id === "coordination" && <CoordinationSection data={data} setData={setData} />}
              {current.id === "balance" && <BalanceSection data={data} setData={setData} />}
              {current.id === "gait" && <GaitSection data={data} setData={setData} />}
              {current.id === "functional" && <FunctionalSection data={data} setData={setData} />}
              {current.id === "outcomes" && <OutcomesSection data={data} setData={setData} />}
              {current.id === "interpretation" && <InterpretationSection data={data} setData={setData} />}
              {current.id === "precautions" && <PrecautionsSection data={data} setData={setData} setting={setting} />}
              {current.id === "aiTreatment" && <AiTreatmentSuggestionsSection data={data} setData={setData} />}
              {current.id === "summary" && (
                <>
                  <SummarySection setting={setting} data={data} assessSteps={assessSteps} />
                  <button type="button" className="ghost-btn" style={{ width: "100%", marginTop: 4 }} onClick={() => setSaveModalOpen(true)}>
                    ⭐ Save this assessment as a template
                  </button>
                </>
              )}
              {current.id && current.id.startsWith("nx-") && <CustomSection id={current.id} meta={current} data={data} setData={setData} />}
            </>
          )}
        </div>

        {(phase === "setting" || phase === "assess") && (
          <div className="bottombar">
            {phase === "assess" && step < total - 1 && (
              <button className="ghost-btn" onClick={goBack}>
                Back
              </button>
            )}
            {phase === "assess" && step === total - 1 ? (
              // Summary & Review is the last step -- (2026-08-20, Aditi:
              // "after the assessment last page summary and review should
              // show as save assessment or edit more") same reasoning as
              // CardiopulmonaryAssessment.jsx's matching change: data
              // already autosaves continuously, so "Save Assessment" just
              // means "I'm done, take me back"; "Edit More" jumps back to
              // Patient Information (step 1, always first in stepOrder) so
              // the step-nav pills are available to revisit any section.
              <>
                <button className="ghost-btn" onClick={() => setStep(1)}>
                  ✏️ Edit More
                </button>
                <button className="primary-btn" onClick={() => onNav?.("clinical")}>
                  ✅ Save Assessment
                </button>
              </>
            ) : (
              <button
                className="primary-btn"
                disabled={phase === "setting" && !canProceedSetting}
                onClick={() => (phase === "setting" ? setPhase("mode") : goNext())}
              >
                {phase === "setting" ? "Continue" : step === total - 2 ? "Review & finish" : "Next"}
              </button>
            )}
          </div>
        )}

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
              <SummarySection setting={setting} data={data} assessSteps={assessSteps} />
            </div>
          </div>
        )}
        <InfoCard data={activeCard} onClose={() => setActiveCard(null)} />

        {saveModalOpen && (
          <div className="ct-modal">
            <div className="ct-modal-header">
              <div className="ct-modal-title">⭐ Save as Template</div>
              <button type="button" className="ct-modal-close" onClick={() => setSaveModalOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="ct-modal-body" style={{ padding: "4px 16px 16px" }}>
              <TextField label="Template name" value={saveName} onChange={setSaveName} placeholder="e.g. My Stroke Assessment" />
            </div>
            <div className="ct-modal-footer">
              <button type="button" className="primary-btn" disabled={!saveName.trim()} onClick={confirmSaveTemplate}>
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </InfoCardContext.Provider>
  );
}

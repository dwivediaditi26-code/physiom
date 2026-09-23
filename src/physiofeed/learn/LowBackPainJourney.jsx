import { useEffect, useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { NotebookFont, EvidenceBadge, DoodleConnector, DoodleCircle } from "./notebookTheme.jsx";
import { CLINICAL_CASES } from "./clinicalCases.js";

// Low back pain, note-wise (2026-09-20, Aditi shared a real handwritten
// physio-notes reference: white ruled paper, red margin line + circles,
// yellow highlighter, bold underlined headings, numbered sections flowing
// as continuous notes). This is the only place notebookTheme.jsx mounts --
// the rest of Clinical Learning (Home, Conditions list) stays untouched.

const PAGES = [
  { key: "anatomy", num: "01", icon: "🦴", title: "Anatomy", sub: "Know the structures" },
  { key: "physiology", num: "02", icon: "⚙️", title: "Normal physiology", sub: "Before abnormal, know normal" },
  { key: "functionalAnatomy", num: "03", icon: "🏃", title: "Functional anatomy", sub: "How does it help movement?" },
  { key: "whatHappens", num: "04", icon: "🔄", title: "What happens?", sub: "Normal → change → symptoms" },
  { key: "clinicalPresentation", num: "05", icon: "👤", title: "Clinical presentation", sub: "What will I see?" },
  { key: "assessment", num: "06", icon: "🔍", title: "Assessment", sub: "What should I examine?" },
  { key: "clinicalReasoning", num: "07", icon: "🧠", title: "Clinical reasoning", sub: "Connect the findings" },
  { key: "management", num: "08", icon: "💪", title: "Management", sub: "How do we help the patient?" },
  { key: "redFlags", num: "09", icon: "🚨", title: "Red flags", sub: "What should I NOT miss?" },
  { key: "clinicalCase", num: "10", icon: "🧑‍⚕️", title: "Clinical case", sub: "Your turn. Meet the patient." },
];

const PROGRESS_KEY = "physiom_learn_condition_progress";
function readProgress(id) {
  try { return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}")[id] || []); } catch { return new Set(); }
}
function markDone(id, pageKey) {
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    const cur = new Set(all[id] || []);
    cur.add(pageKey);
    all[id] = [...cur];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch { /* storage blocked */ }
}

/* ---------- note-writing helpers (flowing text, not app cards) ---------- */

function P({ children }) { return <p className="nb-body" style={{ margin: "8px 0" }}>{children}</p>; }

let n3 = 0;
function H3({ children, reset }) {
  if (reset) n3 = 0;
  n3 += 1;
  return (
    <div className="nb-h3" style={{ marginTop: 18 }}>
      {n3}. <span className="nb-mark-block">{children}</span>
    </div>
  );
}

function Mark({ children }) { return <mark className="nb-mark">{children}</mark>; }

function Table({ rows, cols }) {
  return (
    <table className="nb-table">
      <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
    </table>
  );
}

function Notes({ items }) {
  return (
    <div style={{ margin: "6px 0" }}>
      {items.map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 8, padding: "3px 0" }}>
          <span aria-hidden="true">•</span>
          <span className="nb-body">{t}</span>
        </div>
      ))}
    </div>
  );
}

function DefNotes({ items, get = (x) => x }) {
  return (
    <div style={{ margin: "6px 0" }}>
      {items.map((it, i) => {
        const v = get(it);
        return (
          <div key={i} style={{ padding: "7px 0", borderBottom: i < items.length - 1 ? "1px dashed var(--nb-line-strong)" : "none" }}>
            <span className="nb-body"><Mark>{v.label}</Mark></span>
            {v.note && <span className="nb-body"> — {v.note}</span>}
          </div>
        );
      })}
    </div>
  );
}

function FlowNotes({ items }) {
  return (
    <div style={{ margin: "8px 0" }}>
      {items.map((f, i) => (
        <div key={f.label}>
          <span className="nb-body"><strong>{f.label}.</strong> {f.note}</span>
          {i < items.length - 1 && <DoodleConnector color="var(--nb-ink-faint)" short />}
        </div>
      ))}
    </div>
  );
}

function Box({ children, red, title }) {
  return (
    <div className={`nb-box ${red ? "nb-box-red" : ""}`}>
      {title && <div className="nb-h3" style={{ marginBottom: 6, color: red ? "var(--nb-red)" : "var(--nb-ink)" }}>{title}</div>}
      <span className="nb-body">{children}</span>
    </div>
  );
}

// Labelled schematic anatomy diagrams (2026-09-21, Aditi shared a real
// illustrated-notebook spread and asked to add images "like that"). No image
// generation tool is available here, and pulling real anatomy-textbook
// images off the web would be a copyright risk for a real product, so these
// are custom-drawn SVG schematics instead -- teaching diagrams, not
// anatomically precise art -- styled to sit on the notebook page.
const BONE = "#E8DCC0";
const DISC_FILL = "#A9C9E3";
const CORD_FILL = "#F3DE7A";
const NUCLEUS_FILL = "#EAF3DE";
const M_ERECTOR = "#D98E86";
const M_MULTIFIDUS = "#8FB86D";
const M_QL = "#E3C27D";

function DiagramPanel({ title, children }) {
  return (
    <div className="nb-diagram-panel">
      <div className="nb-diagram-title">{title}</div>
      <div className="nb-diagram-body">{children}</div>
    </div>
  );
}

function Leader({ x1, y1, x2, y2, label, color = "var(--nb-ink-soft)", anchor }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--nb-ink-faint)" strokeWidth="1" strokeDasharray="2 3" />
      <text x={x2} y={y2} fontSize="10.5" fill={color} fontFamily="inherit" textAnchor={anchor || "start"}>{label}</text>
    </g>
  );
}

function SagittalSpineDiagram() {
  const vx = 62, vw = 72, vh = 36;
  const levels = [16, 62, 108];
  return (
    <svg viewBox="0 0 230 210" width="100%" height="190" role="img" aria-label="Schematic sagittal cross-section of the lumbar spine">
      <rect x="150" y="10" width="16" height="150" rx="8" fill={CORD_FILL} stroke="var(--nb-ink)" strokeWidth="1.5" />
      <line x1="158" y1="16" x2="158" y2="154" stroke="var(--nb-ink)" strokeWidth="1" strokeDasharray="2 3" />
      {levels.map((y, i) => (
        <g key={i}>
          <rect x={vx} y={y} width={vw} height={vh} rx="7" fill={BONE} stroke="var(--nb-ink)" strokeWidth="1.6" />
          <path d={`M${vx + vw} ${y + vh / 2 - 5} L${vx + vw + 18} ${y + vh / 2} L${vx + vw} ${y + vh / 2 + 5} Z`} fill={BONE} stroke="var(--nb-ink)" strokeWidth="1.2" />
          {i < levels.length - 1 && <rect x={vx} y={y + vh} width={vw} height={levels[i + 1] - (y + vh)} rx="3" fill={DISC_FILL} stroke="var(--nb-ink)" strokeWidth="1.4" />}
        </g>
      ))}
      <Leader x1={vx + vw / 2} y1={levels[0] + vh / 2} x2="8" y2="26" label="Vertebral body" />
      <Leader x1={vx + vw / 2} y1={levels[0] + vh + 5} x2="8" y2="80" label="Disc" />
      <Leader x1="158" y1="90" x2="196" y2="70" label="Spinal canal" />
      <Leader x1={vx + vw + 14} y1={levels[2] + vh / 2} x2="196" y2="188" label="Spinous process" />
    </svg>
  );
}

function AxialDiscDiagram() {
  return (
    <svg viewBox="0 0 220 210" width="100%" height="190" role="img" aria-label="Schematic axial cross-section of a herniated disc compressing a nerve root">
      <circle cx="100" cy="95" r="52" fill={DISC_FILL} stroke="var(--nb-ink)" strokeWidth="1.8" />
      <circle cx="100" cy="95" r="25" fill={NUCLEUS_FILL} stroke="var(--nb-ink)" strokeWidth="1.6" />
      <path d="M142 72 C 162 66, 176 82, 166 98 C 158 109, 142 106, 142 96 Z" fill="var(--nb-red-bg)" stroke="var(--nb-red)" strokeWidth="1.8" />
      <circle cx="180" cy="88" r="7" fill="none" stroke="var(--nb-red)" strokeWidth="2" />
      <line x1="175" y1="83" x2="185" y2="93" stroke="var(--nb-red)" strokeWidth="2" />
      <line x1="185" y1="83" x2="175" y2="93" stroke="var(--nb-red)" strokeWidth="2" />
      <ellipse cx="55" cy="150" rx="15" ry="9" fill={BONE} stroke="var(--nb-ink)" strokeWidth="1.4" />
      <path d="M40 168 Q 100 195 160 168" fill="none" stroke={BONE} strokeWidth="14" strokeLinecap="round" />
      <path d="M40 168 Q 100 195 160 168" fill="none" stroke="var(--nb-ink)" strokeWidth="1.4" />
      <Leader x1="88" y1="95" x2="8" y2="30" label="Nucleus pulposus" />
      <Leader x1="128" y1="60" x2="8" y2="190" label="Annulus fibrosus" />
      <Leader x1="180" y1="80" x2="186" y2="60" label="Nerve root compression" anchor="end" />
      <Leader x1="55" y1="150" x2="12" y2="165" label="Pedicle" />
      <Leader x1="100" y1="185" x2="100" y2="205" label="Lamina" anchor="middle" />
    </svg>
  );
}

function PostureDiagram() {
  const cols = [
    { x: 38, d: "M38 8 C 26 45, 48 80, 34 118 C 24 148, 38 168, 34 195", label: "Normal", ok: true },
    { x: 118, d: "M118 8 C 100 50, 145 78, 106 118 C 82 150, 118 168, 106 195", label: "Hyperlordosis", ok: false },
    { x: 198, d: "M198 8 L196 55 L200 100 L197 145 L198 195", label: "Flat back", ok: false },
  ];
  return (
    <svg viewBox="0 0 240 215" width="100%" height="190" role="img" aria-label="Lateral posture comparison: normal lordosis, hyperlordosis, and flat back">
      {cols.map((c) => (
        <g key={c.label}>
          <path d={c.d} fill="none" stroke="var(--nb-ink)" strokeWidth="3" strokeLinecap="round" />
          <text x={c.x} y="210" fontSize="10.5" fill="var(--nb-ink-soft)" fontFamily="inherit" textAnchor="middle">{c.label}</text>
          <text x={c.x} y="24" fontSize="15" fill={c.ok ? "var(--nb-sage)" : "var(--nb-red)"} textAnchor="middle">{c.ok ? "✓" : "✕"}</text>
        </g>
      ))}
    </svg>
  );
}

function BackMusclesDiagram() {
  return (
    <svg viewBox="0 0 220 225" width="100%" height="190" role="img" aria-label="Simplified schematic of the deep posterior back muscles">
      <path d="M60 150 L160 150 L175 192 L45 192 Z" fill={BONE} stroke="var(--nb-ink)" strokeWidth="1.6" />
      <line x1="110" y1="10" x2="110" y2="150" stroke="var(--nb-ink)" strokeWidth="2" />
      <path d="M92 20 C 80 60, 82 110, 88 150 L100 150 C 96 110, 96 60, 104 20 Z" fill={M_ERECTOR} stroke="var(--nb-ink)" strokeWidth="1.2" opacity="0.88" />
      <path d="M128 20 C 140 60, 138 110, 132 150 L120 150 C 124 110, 124 60, 116 20 Z" fill={M_ERECTOR} stroke="var(--nb-ink)" strokeWidth="1.2" opacity="0.88" />
      <path d="M100 88 C 96 110, 98 132, 102 150 L108 150 C 106 132, 106 110, 108 88 Z" fill={M_MULTIFIDUS} stroke="var(--nb-ink)" strokeWidth="1" />
      <path d="M120 88 C 124 110, 122 132, 118 150 L112 150 C 114 132, 114 110, 112 88 Z" fill={M_MULTIFIDUS} stroke="var(--nb-ink)" strokeWidth="1" />
      <path d="M65 128 L92 128 L96 156 L60 160 Z" fill={M_QL} stroke="var(--nb-ink)" strokeWidth="1.2" opacity="0.88" />
      <path d="M155 128 L128 128 L124 156 L160 160 Z" fill={M_QL} stroke="var(--nb-ink)" strokeWidth="1.2" opacity="0.88" />
      <Leader x1="88" y1="55" x2="8" y2="42" label="Erector spinae" />
      <Leader x1="104" y1="115" x2="8" y2="118" label="Multifidus" />
      <Leader x1="88" y1="148" x2="8" y2="185" label="Quadratus lumborum" />
    </svg>
  );
}

function AnatomyDiagramGrid() {
  return (
    <div className="nb-diagram-grid">
      <DiagramPanel title="Sagittal cross-section"><SagittalSpineDiagram /></DiagramPanel>
      <DiagramPanel title="Axial: disc herniation"><AxialDiscDiagram /></DiagramPanel>
      <DiagramPanel title="Posterior: deep back muscles"><BackMusclesDiagram /></DiagramPanel>
      <DiagramPanel title="Lateral posture variations"><PostureDiagram /></DiagramPanel>
    </div>
  );
}

/* ---------- page bodies ---------- */

function PageBody({ data, pageKey }) {
  switch (pageKey) {
    case "anatomy": {
      const a = data.anatomy;
      return (
        <>
          <EvidenceBadge tier={a.tier} />
          <P>{a.intro}</P>
          <AnatomyDiagramGrid />
          <DefNotes items={a.structures} get={(s) => ({ label: s.label, note: s.note })} />
          <Box title="✍️ Clinical pearl">{a.pearl}</Box>
        </>
      );
    }
    case "physiology": {
      const p = data.physiology;
      return (
        <>
          <EvidenceBadge tier={p.tier} />
          <P>{p.intro}</P>
          <FlowNotes items={p.flow} />
          <P>{p.detail}</P>
          <Box title="✍️ Clinical pearl">{p.pearl}</Box>
        </>
      );
    }
    case "functionalAnatomy": {
      const f = data.functionalAnatomy;
      return (
        <>
          <EvidenceBadge tier={f.tier} />
          <P>{f.intro}</P>
          <DefNotes items={f.items} get={(x) => ({ label: x.task, note: x.note })} />
        </>
      );
    }
    case "whatHappens": {
      const w = data.whatHappens;
      return (
        <>
          <EvidenceBadge tier={w.tier} />
          <P>{w.intro}</P>
          <FlowNotes items={w.flow} />
          <H3 reset>What we're sure of</H3><P>{w.established}</P>
          <H3>What's still uncertain</H3><P>{w.uncertain}</P>
          <Box title="✍️ Clinical pearl">{w.pearl}</Box>
        </>
      );
    }
    case "clinicalPresentation": {
      const cp = data.clinicalPresentation;
      const dd = data.differentialDiagnosis;
      return (
        <>
          <EvidenceBadge tier={cp.tier} />
          <P>{cp.intro}</P>
          <H3 reset>Symptoms</H3><Notes items={cp.symptoms} />
          <H3>Aggravating</H3><Notes items={cp.aggravating} />
          <H3>Easing</H3><Notes items={cp.easing} />
          <H3>Signs</H3><Notes items={cp.signs} />
          <P><em>{cp.note}</em></P>
          <H3>Differential diagnosis</H3>
          <P>{dd.intro}</P>
          <Table cols={["Condition", "Clue"]} rows={dd.items.map((x) => [x.name, x.clue])} />
          <P><em>{dd.caution}</em></P>
        </>
      );
    }
    case "assessment": {
      const as = data.assessment;
      return (
        <>
          <EvidenceBadge tier={as.tier} />
          <P>{as.intro}</P>
          <div style={{ margin: "6px 0" }}>
            {as.order.map((o, i) => (
              <div key={i} style={{ padding: "5px 0" }}>
                <span className="nb-body"><strong>{i + 1}. {o.step}</strong> — {o.note}</span>
              </div>
            ))}
          </div>
          <H3 reset>Investigations</H3><P>{as.investigations}</P>
          <H3>Risk stratification</H3><P>{as.outcomeMeasureNote}</P>
        </>
      );
    }
    case "clinicalReasoning": {
      const cr = data.clinicalReasoning;
      return (
        <>
          <EvidenceBadge tier={cr.tier} />
          <P>{cr.intro}</P>
          <FlowNotes items={cr.worked} />
          <P>{cr.note}</P>
        </>
      );
    }
    case "management": {
      const m = data.management;
      return (
        <>
          <EvidenceBadge tier={m.tier} />
          <P>{m.intro}</P>
          <H3 reset>Goals</H3><Notes items={m.goals} />
          <H3>Recommended</H3>
          <DefNotes items={m.recommended} get={(x) => ({ label: x.item, note: x.note })} />
          <H3>May be considered</H3>
          <DefNotes items={m.consider} get={(x) => ({ label: x.item, note: x.note })} />
          <H3>Not recommended</H3>
          <Box red><ul style={{ margin: 0, paddingLeft: 18 }}>{m.notRecommended.map((t, i) => <li key={i}>{t}</li>)}</ul></Box>
          <Box red title="Evidence changes — a real example">{m.evidenceUpdateNote}</Box>
          <H3>Exercise principles</H3><P>{m.exercise.intro}</P><Notes items={m.exercise.principles} />
          <H3>Patient education</H3><Notes items={m.patientEducation} />
          <H3>Prognosis</H3><P>{m.prognosis}</P>
          <H3>Outcome measures</H3>
          <Table cols={["Measure", "Use"]} rows={m.outcomeMeasures.map((x) => [x.name, x.use])} />
        </>
      );
    }
    case "redFlags": {
      const rf = data.redFlags;
      return (
        <>
          <EvidenceBadge tier={rf.tier} />
          <P>{rf.intro}</P>
          {rf.groups.map((g) => (
            <Box key={g.name} red title={`🚨 ${g.name}`}>
              <span className="nb-body"><strong>Concern:</strong> {g.concern}</span><br />
              <span className="nb-body"><strong>Why:</strong> {g.why}</span><br />
              <span className="nb-body" style={{ fontWeight: 700 }}><strong>Do:</strong> {g.action}</span>
            </Box>
          ))}
          <P><em>{rf.caution}</em></P>
        </>
      );
    }
    default:
      return null;
  }
}

function ClinicalCasePage({ data, onOpenCase }) {
  const relatedCase = CLINICAL_CASES.find((k) => k.conditionId === data.legacyConditionId);
  return (
    <>
      <P>Time to put it together. Meet a real patient and work the case step by step — history, exam, reasoning, and a plan.</P>
      {relatedCase ? (
        <>
          <P><strong>Case {relatedCase.number} — {relatedCase.title}.</strong> {relatedCase.stem}</P>
          <button type="button" className="nb-link" onClick={() => onOpenCase(relatedCase)}>Open the case →</button>
        </>
      ) : (
        <P><em>A written case for this condition is being added.</em></P>
      )}
      <H3 reset>Key takeaways</H3>
      <Notes items={data.keyTakeaways} />
      <H3>References</H3>
      <div style={{ margin: "6px 0" }}>
        {data.references.map((r, i) => (
          <div key={i} className="nb-note" style={{ padding: "5px 0" }}>[Tier {r.tier}] {r.text}</div>
        ))}
      </div>
    </>
  );
}

function NotePage({ data, index, onBack, onNext, onOpenCase }) {
  const meta = PAGES[index];
  const prev = PAGES[index - 1];
  const next = PAGES[index + 1];
  useEffect(() => { window.scrollTo?.(0, 0); }, [meta.key]);
  return (
    <div className="nb-step-in">
      <button type="button" className="nb-link" onClick={onBack} style={{ marginBottom: 6 }}><ChevronLeft size={16} /> Contents</button>
      <div className="nb-h1">{meta.icon} <span className="nb-mark-block">{meta.title}</span></div>
      <div className="nb-sub" style={{ marginTop: 6 }}>"{meta.sub}"</div>

      <div className="nb-notes" style={{ marginTop: 14 }}>
        <span className="nb-badge">{index + 1}/{PAGES.length}</span>
        {meta.key === "clinicalCase" ? <ClinicalCasePage data={data} onOpenCase={onOpenCase} /> : <PageBody data={data} pageKey={meta.key} />}
      </div>

      <hr className="nb-divider" />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {prev ? <button type="button" className="nb-link" onClick={() => onNext(index - 1, false)}>← {prev.title}</button> : <span />}
        <button type="button" className="nb-link" onClick={() => onNext(next ? index + 1 : null, true)}>{next ? `${next.title} →` : "Done ✓"}</button>
      </div>
    </div>
  );
}

export default function LowBackPainJourney({ data, onBack, onOpenCase }) {
  const [openIndex, setOpenIndex] = useState(null);
  const [direction, setDirection] = useState("next");
  const [done, setDone] = useState(() => readProgress(data.id));

  const openFromContents = (i) => { setDirection("next"); setOpenIndex(i); };

  const goTo = (i, complete) => {
    if (complete) markDone(data.id, PAGES[openIndex].key);
    setDone(readProgress(data.id));
    if (i == null) { setDirection("prev"); setOpenIndex(null); }
    else { setDirection(i > openIndex ? "next" : "prev"); setOpenIndex(i); }
  };

  return (
    <div className="nb-root" style={{ background: "var(--nb-bg)", padding: "14px 16px 28px", borderRadius: 16 }}>
      <NotebookFont />
      {openIndex != null ? (
        <div key={`p-${openIndex}`} className={`nb-flip nb-flip-${direction}`}>
          <NotePage data={data} index={openIndex} onBack={() => goTo(null, false)} onNext={goTo} onOpenCase={onOpenCase} />
        </div>
      ) : (
        <div key="contents" className={`nb-flip nb-flip-${direction}`}>
        <div>
          <button type="button" className="nb-link" onClick={onBack} style={{ marginBottom: 6 }}><ChevronLeft size={16} /> Back</button>
          <div className="nb-note">{data.region} · {data.level}</div>
          <div className="nb-h1" style={{ marginTop: 4 }}><span className="nb-mark-block">{data.name}</span></div>
          <div className="nb-sub" style={{ marginTop: 6 }}>"{data.tagline}"</div>
          <P>{data.overview}</P>

          <div className="nb-label" style={{ marginTop: 20, marginBottom: 4 }}>Contents — {done.size} / {PAGES.length} learned</div>
          {PAGES.map((s, i) => (
            <button key={s.key} type="button" className="nb-index-row" onClick={() => openFromContents(i)}>
              <span style={{ width: 20, flexShrink: 0 }} aria-hidden="true">{done.has(s.key) ? <Check size={16} color="var(--nb-sage)" strokeWidth={3} /> : s.num}</span>
              <span style={{ flex: 1 }}>
                <span className="nb-body">{s.icon} {s.title}</span>
                <span className="nb-note" style={{ marginLeft: 8 }}>{s.sub}</span>
              </span>
            </button>
          ))}
          <Box title="✍️ Note">{done.size === 0 ? <>This whole thing is <DoodleCircle>non-specific</DoodleCircle> until proven otherwise — start with the structures.</> : done.size === PAGES.length ? "Fully learned — nice work." : "Keep going."}</Box>
        </div>
        </div>
      )}
    </div>
  );
}

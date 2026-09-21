import { useEffect, useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { NotebookFont, EvidenceBadge, DoodleConnector, DoodleCircle, Underline } from "./notebookTheme.jsx";
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
    <div style={{ marginTop: 18 }}>
      <div className="nb-h3">{n3}. {children}</div>
      <Underline width={Math.min(220, 30 + String(children).length * 7)} />
    </div>
  );
}

function Mark({ children }) { return <mark className="nb-mark">{children}</mark>; }

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

// A simple, labelled schematic of the lumbar segment -- stacked vertebrae,
// disc and facet joints with leader-line labels, in the same spirit as the
// hand-drawn anatomy sketches in the reference notes.
function LumbarSketch() {
  return (
    <svg viewBox="0 0 300 170" width="100%" height="150" role="img" aria-label="Simple diagram of a lumbar spinal segment" style={{ display: "block", margin: "10px 0" }}>
      <rect x="90" y="20" width="70" height="34" rx="6" fill="none" stroke="var(--nb-ink)" strokeWidth="2" />
      <ellipse cx="125" cy="60" rx="36" ry="9" fill="none" stroke="var(--nb-red)" strokeWidth="2" />
      <rect x="90" y="70" width="70" height="34" rx="6" fill="none" stroke="var(--nb-ink)" strokeWidth="2" />
      <path d="M70 30 Q 55 45 70 60" fill="none" stroke="var(--nb-ink)" strokeWidth="1.6" />
      <path d="M180 30 Q 195 45 180 60" fill="none" stroke="var(--nb-ink)" strokeWidth="1.6" />
      <line x1="90" y1="87" x2="20" y2="87" stroke="var(--nb-ink-faint)" strokeWidth="1" strokeDasharray="3 3" />
      <text x="8" y="83" fontSize="11" fill="var(--nb-ink-soft)" fontFamily="inherit">vertebra</text>
      <line x1="125" y1="60" x2="220" y2="60" stroke="var(--nb-ink-faint)" strokeWidth="1" strokeDasharray="3 3" />
      <text x="224" y="64" fontSize="11" fill="var(--nb-red)" fontFamily="inherit">disc</text>
      <line x1="75" y1="45" x2="20" y2="20" stroke="var(--nb-ink-faint)" strokeWidth="1" strokeDasharray="3 3" />
      <text x="8" y="16" fontSize="11" fill="var(--nb-ink-soft)" fontFamily="inherit">facet joint</text>
      <circle cx="125" cy="120" r="5" fill="var(--nb-ink)" />
      <line x1="125" y1="120" x2="230" y2="130" stroke="var(--nb-ink-faint)" strokeWidth="1" strokeDasharray="3 3" />
      <text x="150" y="145" fontSize="11" fill="var(--nb-ink-soft)" fontFamily="inherit">nerve root</text>
    </svg>
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
          <LumbarSketch />
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
          <DefNotes items={dd.items} get={(x) => ({ label: x.name, note: x.clue })} />
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
          <DefNotes items={m.outcomeMeasures} get={(x) => ({ label: x.name, note: x.use })} />
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
      <div className="nb-h1">{meta.icon} {meta.title}</div>
      <Underline width={160} />
      <div className="nb-sub" style={{ marginTop: 4 }}>"{meta.sub}"</div>

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
  const [done, setDone] = useState(() => readProgress(data.id));

  const goTo = (i, complete) => {
    if (complete) markDone(data.id, PAGES[openIndex].key);
    setDone(readProgress(data.id));
    if (i == null) setOpenIndex(null); else setOpenIndex(i);
  };

  return (
    <div className="nb-root" style={{ background: "var(--nb-bg)", padding: "14px 16px 28px", borderRadius: 16 }}>
      <NotebookFont />
      {openIndex != null ? (
        <NotePage data={data} index={openIndex} onBack={() => goTo(null, false)} onNext={goTo} onOpenCase={onOpenCase} />
      ) : (
        <div className="nb-step-in">
          <button type="button" className="nb-link" onClick={onBack} style={{ marginBottom: 6 }}><ChevronLeft size={16} /> Back</button>
          <div className="nb-note">{data.region} · {data.level}</div>
          <div className="nb-h1" style={{ marginTop: 4 }}>{data.name}</div>
          <Underline width={170} />
          <div className="nb-sub" style={{ marginTop: 4 }}>"{data.tagline}"</div>
          <P>{data.overview}</P>

          <div className="nb-label" style={{ marginTop: 20, marginBottom: 4 }}>Contents — {done.size} / {PAGES.length} learned</div>
          {PAGES.map((s, i) => (
            <button key={s.key} type="button" className="nb-index-row" onClick={() => setOpenIndex(i)}>
              <span style={{ width: 20, flexShrink: 0 }} aria-hidden="true">{done.has(s.key) ? <Check size={16} color="var(--nb-sage)" strokeWidth={3} /> : s.num}</span>
              <span style={{ flex: 1 }}>
                <span className="nb-body">{s.icon} {s.title}</span>
                <span className="nb-note" style={{ marginLeft: 8 }}>{s.sub}</span>
              </span>
            </button>
          ))}
          <Box title="✍️ Note">{done.size === 0 ? <>This whole thing is <DoodleCircle>non-specific</DoodleCircle> until proven otherwise — start with the structures.</> : done.size === PAGES.length ? "Fully learned — nice work." : "Keep going."}</Box>
        </div>
      )}
    </div>
  );
}

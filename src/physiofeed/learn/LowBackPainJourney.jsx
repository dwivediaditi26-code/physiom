import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Check } from "lucide-react";
import { EvidenceBadge, DoodleConnector, DoodleArrow } from "./notebookTheme.jsx";
import { CLINICAL_CASES } from "./clinicalCases.js";

// The pilot condition journey (2026-09-20, Aditi's brief): a handwritten,
// notebook-styled 10-step learning path for one condition, built to be
// reused for the next condition once this one is approved. `data` is the
// LOW_BACK_PAIN shape from ./conditions/lowBackPain.js -- everything here
// reads from it, nothing clinical is hard-coded in this file.

const STEPS = [
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
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    return all[id] || [];
  } catch { return []; }
}
function markDone(id, stepKey) {
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    const cur = new Set(all[id] || []);
    cur.add(stepKey);
    all[id] = [...cur];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch { /* storage blocked */ }
}

function Callout({ tone = "sage", label, children }) {
  const vars = {
    sage: { bg: "var(--nb-sage-bg)", ink: "var(--nb-sage-ink)", border: "var(--nb-sage)" },
    blue: { bg: "var(--nb-blue-bg)", ink: "var(--nb-blue-ink)", border: "var(--nb-blue)" },
    terra: { bg: "var(--nb-terra-bg)", ink: "var(--nb-terra-ink)", border: "var(--nb-terra)" },
    berry: { bg: "var(--nb-berry-bg)", ink: "var(--nb-berry-ink)", border: "var(--nb-berry)" },
  }[tone];
  return (
    <div style={{ background: vars.bg, border: `1.5px solid ${vars.border}`, borderRadius: 14, padding: "11px 13px", marginTop: 10 }}>
      {label && <div className="nb-label" style={{ color: vars.ink, marginBottom: 4 }}>{label}</div>}
      <div className="nb-body" style={{ color: vars.ink }}>{children}</div>
    </div>
  );
}

function FlowSteps({ items }) {
  return (
    <div style={{ marginTop: 8 }}>
      {items.map((f, i) => (
        <div key={f.label}>
          <div className="nb-card" style={{ padding: "10px 14px" }}>
            <div className="nb-h3">{f.label}</div>
            {f.note && <div className="nb-note" style={{ marginTop: 3 }}>{f.note}</div>}
          </div>
          {i < items.length - 1 && <DoodleConnector done />}
        </div>
      ))}
    </div>
  );
}

function CardList({ items, get = (x) => x }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
      {items.map((it, i) => {
        const v = get(it);
        return (
          <div key={i} className="nb-card" style={{ padding: "10px 13px" }}>
            <div className="nb-body" style={{ fontWeight: 700 }}>{v.label}</div>
            {v.note && <div className="nb-note" style={{ marginTop: 2 }}>{v.note}</div>}
          </div>
        );
      })}
    </div>
  );
}

function Bullets({ items }) {
  return (
    <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((t, i) => (
        <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span aria-hidden="true" style={{ color: "var(--nb-terra)", fontWeight: 700 }}>✍️</span>
          <span className="nb-body">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionHead({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div className="nb-h1">{icon} {title}</div>
      {sub && <div className="nb-sub" style={{ marginTop: 2 }}>“{sub}”</div>}
    </div>
  );
}

function StepBody({ data, stepKey }) {
  switch (stepKey) {
    case "anatomy": {
      const a = data.anatomy;
      return (
        <>
          <EvidenceBadge tier={a.tier} />
          <p className="nb-body">{a.intro}</p>
          <CardList items={a.structures} get={(s) => ({ label: s.label, note: s.note })} />
          <div className="nb-sticky" style={{ marginTop: 14 }}><span className="nb-body">✍️ Clinical pearl — {a.pearl}</span></div>
        </>
      );
    }
    case "physiology": {
      const p = data.physiology;
      return (
        <>
          <EvidenceBadge tier={p.tier} />
          <p className="nb-body">{p.intro}</p>
          <FlowSteps items={p.flow} />
          <p className="nb-body" style={{ marginTop: 12 }}>{p.detail}</p>
          <div className="nb-sticky" style={{ marginTop: 14 }}><span className="nb-body">✍️ {p.pearl}</span></div>
        </>
      );
    }
    case "functionalAnatomy": {
      const f = data.functionalAnatomy;
      return (
        <>
          <EvidenceBadge tier={f.tier} />
          <p className="nb-body">{f.intro}</p>
          <CardList items={f.items} get={(x) => ({ label: x.task, note: x.note })} />
        </>
      );
    }
    case "whatHappens": {
      const w = data.whatHappens;
      return (
        <>
          <EvidenceBadge tier={w.tier} />
          <p className="nb-body">{w.intro}</p>
          <FlowSteps items={w.flow} />
          <Callout tone="sage" label="Established">{w.established}</Callout>
          <Callout tone="terra" label="Uncertain / plausible">{w.uncertain}</Callout>
          <div className="nb-sticky" style={{ marginTop: 14 }}><span className="nb-body">✍️ {w.pearl}</span></div>
        </>
      );
    }
    case "clinicalPresentation": {
      const cp = data.clinicalPresentation;
      const dd = data.differentialDiagnosis;
      return (
        <>
          <EvidenceBadge tier={cp.tier} />
          <p className="nb-body">{cp.intro}</p>
          <div className="nb-label" style={{ marginTop: 12 }}>Symptoms</div>
          <Bullets items={cp.symptoms} />
          <div className="nb-label" style={{ marginTop: 12 }}>Aggravating</div>
          <Bullets items={cp.aggravating} />
          <div className="nb-label" style={{ marginTop: 12 }}>Easing</div>
          <Bullets items={cp.easing} />
          <div className="nb-label" style={{ marginTop: 12 }}>Signs</div>
          <Bullets items={cp.signs} />
          <Callout tone="blue">{cp.note}</Callout>

          <div className="nb-h2" style={{ marginTop: 20 }}>🧭 Differential diagnosis</div>
          <p className="nb-body">{dd.intro}</p>
          <CardList items={dd.items} get={(x) => ({ label: x.name, note: x.clue })} />
          <Callout tone="terra">{dd.caution}</Callout>
        </>
      );
    }
    case "assessment": {
      const as = data.assessment;
      return (
        <>
          <EvidenceBadge tier={as.tier} />
          <p className="nb-body">{as.intro}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {as.order.map((o, i) => (
              <div key={i} className="nb-card" style={{ padding: "10px 13px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span className="nb-check nb-check-on" aria-hidden="true"><Check size={14} color="var(--nb-sage-ink)" strokeWidth={3} /></span>
                <div>
                  <div className="nb-body" style={{ fontWeight: 700 }}>{o.step}</div>
                  <div className="nb-note" style={{ marginTop: 2 }}>{o.note}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="nb-h2" style={{ marginTop: 18 }}>🩻 Investigations</div>
          <p className="nb-body">{as.investigations}</p>
          <div className="nb-h2" style={{ marginTop: 18 }}>📊 Risk stratification</div>
          <p className="nb-body">{as.outcomeMeasureNote}</p>
        </>
      );
    }
    case "clinicalReasoning": {
      const cr = data.clinicalReasoning;
      return (
        <>
          <EvidenceBadge tier={cr.tier} />
          <p className="nb-body">{cr.intro}</p>
          <FlowSteps items={cr.worked} />
          <Callout tone="blue">{cr.note}</Callout>
        </>
      );
    }
    case "management": {
      const m = data.management;
      return (
        <>
          <EvidenceBadge tier={m.tier} />
          <p className="nb-body">{m.intro}</p>
          <div className="nb-label" style={{ marginTop: 12 }}>Goals</div>
          <Bullets items={m.goals} />

          <div className="nb-h2" style={{ marginTop: 18 }}>✅ Recommended</div>
          <CardList items={m.recommended} get={(x) => ({ label: x.item, note: x.note })} />

          <div className="nb-h2" style={{ marginTop: 18 }}>🤔 May be considered</div>
          <CardList items={m.consider} get={(x) => ({ label: x.item, note: x.note })} />

          <div className="nb-h2" style={{ marginTop: 18 }}>🚫 Not recommended</div>
          <Callout tone="berry">
            <ul style={{ margin: 0, paddingLeft: 18 }}>{m.notRecommended.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </Callout>

          <Callout tone="terra" label="Evidence changes — a real example">{m.evidenceUpdateNote}</Callout>

          <div className="nb-h2" style={{ marginTop: 18 }}>🏋️ Exercise principles</div>
          <p className="nb-body">{m.exercise.intro}</p>
          <Bullets items={m.exercise.principles} />

          <div className="nb-h2" style={{ marginTop: 18 }}>🗣️ Patient education</div>
          <Bullets items={m.patientEducation} />

          <div className="nb-h2" style={{ marginTop: 18 }}>📈 Prognosis</div>
          <p className="nb-body">{m.prognosis}</p>

          <div className="nb-h2" style={{ marginTop: 18 }}>📊 Outcome measures</div>
          <CardList items={m.outcomeMeasures} get={(x) => ({ label: x.name, note: x.use })} />
        </>
      );
    }
    case "redFlags": {
      const rf = data.redFlags;
      return (
        <>
          <EvidenceBadge tier={rf.tier} />
          <p className="nb-body">{rf.intro}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {rf.groups.map((g) => (
              <div key={g.name} className="nb-card" style={{ borderColor: "var(--nb-berry)" }}>
                <div className="nb-h3" style={{ color: "var(--nb-berry-ink)" }}>🚨 {g.name}</div>
                <div className="nb-note" style={{ marginTop: 6, fontWeight: 700, color: "var(--nb-ink-soft)" }}>What should concern me?</div>
                <div className="nb-body">{g.concern}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "6px 0" }}><DoodleArrow /></div>
                <div className="nb-note" style={{ fontWeight: 700, color: "var(--nb-ink-soft)" }}>Why?</div>
                <div className="nb-body">{g.why}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "6px 0" }}><DoodleArrow /></div>
                <div className="nb-note" style={{ fontWeight: 700, color: "var(--nb-ink-soft)" }}>What should I do?</div>
                <div className="nb-body" style={{ fontWeight: 700 }}>{g.action}</div>
              </div>
            ))}
          </div>
          <Callout tone="blue">{rf.caution}</Callout>
        </>
      );
    }
    default:
      return null;
  }
}

function ClinicalCaseStep({ data, onOpenCase }) {
  const relatedCase = CLINICAL_CASES.find((k) => k.conditionId === data.legacyConditionId);
  return (
    <>
      <p className="nb-body">Time to put it together. Meet a real patient and work the case step by step — history, exam, reasoning, and a plan.</p>
      {relatedCase ? (
        <button type="button" onClick={() => onOpenCase(relatedCase)} className="nb-card" style={{ width: "100%", textAlign: "left", cursor: "pointer", marginTop: 10 }}>
          <div className="nb-label">Case {relatedCase.number}</div>
          <div className="nb-h3" style={{ marginTop: 4 }}>{relatedCase.title}</div>
          <div className="nb-note" style={{ marginTop: 4 }}>{relatedCase.stem}</div>
          <div className="nb-body" style={{ marginTop: 8, color: "var(--nb-terra)", fontWeight: 700 }}>Open the case →</div>
        </button>
      ) : (
        <Callout tone="terra">A written case for this condition is being added.</Callout>
      )}

      <div className="nb-h2" style={{ marginTop: 22 }}>⭐ Key takeaways</div>
      <Bullets items={data.keyTakeaways} />

      <div className="nb-h2" style={{ marginTop: 22 }}>📚 References</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {data.references.map((r, i) => (
          <div key={i} className="nb-note" style={{ display: "flex", gap: 8 }}>
            <span className="nb-pill" style={{ flexShrink: 0, padding: "1px 8px" }}>Tier {r.tier}</span>
            <span>{r.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function StepDetail({ data, stepKey, index, onBack, onNext, onOpenCase }) {
  const meta = STEPS[index];
  const rootRef = useRef(null);
  useEffect(() => { rootRef.current?.scrollTo?.(0, 0); window.scrollTo?.(0, 0); }, [stepKey]);
  const next = STEPS[index + 1];
  return (
    <div ref={rootRef} className="nb-step-in">
      <button type="button" onClick={onBack} className="nb-btn nb-btn-outline" style={{ padding: "6px 10px", marginBottom: 12, border: "none" }}>
        <ChevronLeft size={18} /> Back to journey
      </button>
      <SectionHead icon={meta.icon} title={meta.title} sub={meta.sub} />
      <div style={{ marginTop: 14 }}>
        {stepKey === "clinicalCase" ? <ClinicalCaseStep data={data} onOpenCase={onOpenCase} /> : <StepBody data={data} stepKey={stepKey} />}
      </div>
      <button
        type="button"
        onClick={() => { markDone(data.id, stepKey); onNext(next ? index + 1 : null); }}
        className="nb-btn"
        style={{ width: "100%", marginTop: 22, marginBottom: 8 }}
      >
        {next ? `Next: ${next.title}` : "Finish"} <ChevronRight size={18} />
      </button>
    </div>
  );
}

export default function LowBackPainJourney({ data, onBack, onOpenCase }) {
  const [openIndex, setOpenIndex] = useState(null);
  const [done, setDone] = useState(() => new Set(readProgress(data.id)));

  const openStep = (i) => setOpenIndex(i);
  const closeStep = () => { setDone(new Set(readProgress(data.id))); setOpenIndex(null); };
  const goNext = (i) => { setDone(new Set(readProgress(data.id))); if (i == null) closeStep(); else setOpenIndex(i); };

  if (openIndex != null) {
    return <StepDetail data={data} stepKey={STEPS[openIndex].key} index={openIndex} onBack={closeStep} onNext={goNext} onOpenCase={onOpenCase} />;
  }

  return (
    <div className="nb-step-in">
      <button type="button" onClick={onBack} className="nb-btn nb-btn-outline" style={{ padding: "6px 10px", marginBottom: 8, border: "none" }}>
        <ChevronLeft size={18} /> Back
      </button>
      <div className="nb-pill" style={{ marginBottom: 10 }}>{data.region} · {data.level}</div>
      <div className="nb-h1">{data.name}</div>
      <div className="nb-sub" style={{ marginTop: 4 }}>“{data.tagline}”</div>
      <p className="nb-body" style={{ marginTop: 12 }}>{data.overview}</p>

      <div className="nb-label" style={{ marginTop: 22, marginBottom: 8 }}>My learning path — {done.size} / {STEPS.length} learned</div>
      {STEPS.map((s, i) => {
        const isDone = done.has(s.key);
        return (
          <div key={s.key}>
            <button type="button" onClick={() => openStep(i)} className="nb-card" style={{ width: "100%", textAlign: "left", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
              <span className="nb-check nb-check-on" style={{ width: 34, height: 34, borderRadius: 12, fontSize: 16, flexShrink: 0 }} aria-hidden="true">
                {isDone ? <Check size={18} color="var(--nb-sage-ink)" strokeWidth={3} /> : <span>{s.icon}</span>}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="nb-body" style={{ fontWeight: 700, display: "block" }}>{s.num} — {s.title}</span>
                <span className="nb-note" style={{ display: "block", marginTop: 1 }}>{s.sub}</span>
              </span>
              <ChevronRight size={18} color="var(--nb-ink-faint)" />
            </button>
            {i < STEPS.length - 1 && <DoodleConnector done={isDone} />}
          </div>
        );
      })}
      <div className="nb-sticky" style={{ marginTop: 16, textAlign: "center" }}>
        <span className="nb-body">{done.size === 0 ? "Small steps. Big progress. ✍️" : done.size === STEPS.length ? "Nice work — fully learned! 🎉" : "Keep going! ✍️"}</span>
      </div>
    </div>
  );
}

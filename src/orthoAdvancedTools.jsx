import React, { useState } from "react";
import { SectionIntro, TextArea, InfoButton, InfoCard, InfoCardGrid, Hint, useSectionData } from "./orthoFieldKit.jsx";
import { RESTRICTION_GRADE } from "./orthoClinicalData.js";
import {
  KC_REGIONS,
  NKT_REGIONS,
  CYRIAX_REGIONS_DATA,
  KC_REGION_KEYS,
  NKT_REGION_KEYS,
  CYRIAX_REGION_KEYS,
  FMA_DATA,
  FMA_REGION_KEYS,
  CYRIAX_RESISTED_RESULTS,
  CYRIAX_PAIN_OPTIONS,
  CYRIAX_LIMITED_OPTIONS,
  CYRIAX_DEFAULT_ENDFEEL,
  KALTENBORN_GRADES,
  FASCIA_REGIONS_DATA,
  FASCIA_REGION_KEYS,
  FASCIA_LINES_DATA,
} from "./orthoAdvancedLibrary.js";

/* The real app's KC_REGIONS / NKT_REGIONS / CYRIAX_REGIONS_DATA colors are
   tuned for a dark theme (saturated neon green/cyan/pink) — too loud on our
   light cards. Mute them by blending toward a soft neutral, keeping the
   hue (so the colour-coding still reads at a glance) without the glow. */
function mixToward(hex, target, amount) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return hex;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const mix = (ch) => Math.round(ch * (1 - amount) + target * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
function muteColor(hex) {
  return hex ? mixToward(hex, 130, 0.42) : hex;
}
/* Very light pastel tint for badge/chip backgrounds — same hue, mostly white. */
function tintColor(hex) {
  return hex ? mixToward(hex, 255, 0.88) : hex;
}

/* ============================================================
   Shared colorful region tab bar — each region tints its own
   tab with its real PhysioMind color when active, instead of a
   flat purple strip. That's the "funky" visual signature these
   four modules carry in the real app (vs. the plainer ROM/MMT
   style) — muted for our light theme.
   ============================================================ */
function ColorRegionTabs({ tabs, activeKey, onSelect, regionsData, counts }) {
  return (
    <div className="region-tab-row-wrap">
      <div className="region-tab-row">
        {tabs.map((k) => {
          const meta = regionsData?.[k];
          const active = activeKey === k;
          const color = meta?.color ? muteColor(meta.color) : undefined;
          const style = active && color ? { background: color, borderColor: color, color: "#fff" } : color ? { borderColor: color, color } : undefined;
          const count = counts?.[k] || 0;
          return (
            <button type="button" key={k} className={"region-tab" + (active ? " region-tab-active" : "")} style={style} onClick={() => onSelect(k)}>
              {meta?.icon ? meta.icon + " " : ""}
              {meta?.label || k}
              {count > 0 && <span className="region-tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function useAdvActiveRegion(data, setData, sectionKey_, keys) {
  const [d, set] = useSectionData(data, setData, sectionKey_);
  const [activeKey, setActiveKeyState] = useState(d.activeRegion || keys[0]);
  function setActiveKey(k) {
    setActiveKeyState(k);
    set("activeRegion", k);
  }
  return { d, set, activeKey, setActiveKey };
}

/* ============================================================
   Colorful option-chip row — used by Kinetic Chain + CPA/NKT.
   Each option carries its own clinical-meaning color straight
   from the real data (green = facilitated/normal, amber = mild,
   red = inhibited/severe...), tapped to select, tap again to
   clear.
   ============================================================ */
export function OptionChips({ options, value, onChange }) {
  return (
    <div className="chip-mini-row">
      {options.map((o) => {
        const selected = value === o.val;
        const muted = muteColor(o.color);
        const style = selected ? { background: muted, borderColor: muted, color: "#fff", fontWeight: 700 } : { borderColor: muted, color: muted };
        return (
          <button type="button" key={o.val} className="chip-mini funky-chip" style={style} onClick={() => onChange(selected ? "" : o.val)}>
            {o.val}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   KINETIC CHAIN — Cook & Boyle joint-by-joint (mobility/
   stability) screen, straight from KC_REGIONS.
   ============================================================ */
function kcCount(entry, tests) {
  if (!entry) return 0;
  return tests.filter((t) => entry[t.id]).length;
}

// Same real KC_REGIONS data (id/how/chainEffect/treatment), split across
// Perform/Reference/Interpret tabs -- same pattern as Ortho's ROM/MMT/
// Special Tests. image uses the test's own real id -- present on
// Cloudinary for the foot/ankle and hip regions today; falls back to
// InfoButton's own placeholder for regions not yet photographed.
export function kcRichItem(t) {
  return {
    image: t.id,
    title: t.label,
    subtitle: t.joint,
    perform: <InfoCard icon="👐" label="How to perform" tint="violet">{t.how}</InfoCard>,
    reference: <InfoCard icon="⛓️" label="Kinetic chain effect" tint="blue">{t.chainEffect}</InfoCard>,
    interpret: <InfoCard icon="🎯" label="Treatment" tint="green">{t.treatment}</InfoCard>,
  };
}

export function KineticChainSection({ data, setData, sectionKey = "kineticChain" }) {
  const { d, set, activeKey, setActiveKey } = useAdvActiveRegion(data, setData, sectionKey, KC_REGION_KEYS);
  const region = KC_REGIONS[activeKey];
  const entry = d[activeKey] || {};
  const counts = {};
  KC_REGION_KEYS.forEach((k) => (counts[k] = kcCount(d[k], KC_REGIONS[k].tests)));

  return (
    <>
      <SectionIntro icon="⛓️" title="Kinetic Chain" info="Joint-by-joint theory (Cook & Boyle): each region alternates between needing mobility and needing stability. A restriction or instability at one link commonly shows up as compensation further along the chain." />
      <ColorRegionTabs tabs={KC_REGION_KEYS} activeKey={activeKey} onSelect={setActiveKey} regionsData={KC_REGIONS} counts={counts} />
      <div className="rom-card">
        <div className="rom-card-title">
          {region.label}
          <span className="funky-role-badge" style={{ background: tintColor(region.color), color: muteColor(region.color) }}>
            {region.role}
          </span>
        </div>
        {region.tests.map((t) => (
          <div className="movement-card" key={t.id}>
            <div className="movement-name-row">
              <span className="movement-name">{t.label}</span>
              <InfoButton title={t.label} richItem={kcRichItem(t)} />
            </div>
            <div className="muscle-subtitle">{t.joint}</div>
            <OptionChips options={t.options} value={entry[t.id]} onChange={(v) => set(activeKey, { ...entry, [t.id]: v })} />
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================================================
   CPA — Compensation Pattern Analysis (Neurokinetic Therapy),
   straight from NKT_REGIONS.
   ============================================================ */
// Same real NKT_REGIONS data (id/how/compensator/treatment), split across
// Perform/Reference/Interpret tabs. No NKT photos on Cloudinary yet --
// image stays unset, falling back to InfoButton's own placeholder, same
// honest-empty-state pattern used everywhere else in this system.
// t.options already carries this exact clinical detail (Facilitated/
// Inhibited/Overactive, each with a real `meaning`) but it only ever
// surfaced as bare option-chip labels in the test row itself -- a student
// picking a chip had no way to see what that finding actually means before
// deciding whether to test it. Surface the Inhibited/Overactive meanings on
// the Interpret tab (2026-09-03, Aditi: "if this muscle is inhibited, then
// what it causes, if overactive what it causes... a student should know if
// he wants to assess it or not") so it's read before the exam, not just
// after picking a result.
export function cpaRichItem(t) {
  const consequences = (t.options || []).filter((o) => /inhibit|overactive/i.test(o.val));
  return {
    image: t.id,
    title: t.label,
    subtitle: t.muscle,
    perform: <InfoCard icon="👐" label="How to test" tint="violet">{t.how}</InfoCard>,
    reference: <InfoCard icon="🔀" label="Common compensators" tint="amber">{t.compensator}</InfoCard>,
    interpret: (
      <>
        {consequences.map((o, i) => (
          <InfoCard key={i} icon={/inhibit/i.test(o.val) ? "🔻" : "🔺"} label={`If ${o.val}`} tint={/inhibit/i.test(o.val) ? "red" : "amber"}>
            {o.meaning}
          </InfoCard>
        ))}
        <InfoCard icon="🎯" label="Treatment" tint="green">{t.treatment}</InfoCard>
      </>
    ),
  };
}

export function CpaSection({ data, setData, sectionKey = "cpa" }) {
  const { d, set, activeKey, setActiveKey } = useAdvActiveRegion(data, setData, sectionKey, NKT_REGION_KEYS);
  const region = NKT_REGIONS[activeKey];
  const entry = d[activeKey] || {};
  const counts = {};
  NKT_REGION_KEYS.forEach((k) => (counts[k] = kcCount(d[k], NKT_REGIONS[k].tests)));

  return (
    <>
      <SectionIntro icon="🧠" title="CPA — Compensation Pattern Analysis" info="Neurokinetic Therapy screening: identifies which muscles the motor control centre has inhibited, and which synergists have become overworked compensators as a result." />
      <ColorRegionTabs tabs={NKT_REGION_KEYS} activeKey={activeKey} onSelect={setActiveKey} regionsData={NKT_REGIONS} counts={counts} />
      <div className="rom-card">
        <div className="rom-card-title">{region.label}</div>
        {region.tests.map((t) => (
          <div className="movement-card" key={t.id}>
            <div className="movement-name-row">
              <span className="movement-name">{t.label}</span>
              <InfoButton title={t.label} richItem={cpaRichItem(t)} />
            </div>
            <div className="muscle-subtitle">{t.muscle}</div>
            <OptionChips options={t.options} value={entry[t.id]} onChange={(v) => set(activeKey, { ...entry, [t.id]: v })} />
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================================================
   STTT — Selective Tissue Tension Testing (Cyriax), straight
   from CYRIAX_REGIONS_DATA. Active / Passive / Resisted / Joint
   Play sub-tabs, each with the field type Cyriax actually uses.
   ============================================================ */
const CYRIAX_TABS = [
  { id: "activeROM", label: "Active", icon: "🚶" },
  { id: "passiveROM", label: "Passive", icon: "🤲" },
  { id: "resistedTests", label: "Resisted", icon: "💪" },
  { id: "jointPlay", label: "Joint Play", icon: "🔧" },
];

// Region-level reference card, from the real CYRIAX_REGIONS_DATA anatomy/
// capsularPattern/redFlags/differentials fields -- Perform=anatomy,
// Reference=capsular pattern, Interpret=red flags + differentials.
function cyriaxRegionRichItem(region) {
  return {
    title: `${region.label} — reference`,
    perform: <InfoCard icon="🩻" label="Anatomy" tint="violet">{region.anatomy}</InfoCard>,
    reference: <InfoCard icon="🔵" label="Capsular pattern" tint="blue">{region.capsularPattern}</InfoCard>,
    interpret: (region.redFlags?.length || region.differentials?.length) && (
      <>
        {region.redFlags?.length > 0 && <InfoCard icon="🚩" label="Red flags" tint="red">{region.redFlags.join(", ")}</InfoCard>}
        {region.differentials?.length > 0 && <InfoCard label="Differentials to consider" tint="gray">{region.differentials.join(", ")}</InfoCard>}
      </>
    ),
  };
}

// Individual Cyriax test (t.how only, no id-based photos) -- always
// Perform-only; the InfoButton sheet hides tabs with no content, so this
// renders as a single-pane sheet without a tab strip.
export function cyriaxTestRichItem(t) {
  return {
    title: t.label,
    perform: <InfoCard icon="👐" label="How to perform" tint="violet">{t.how}</InfoCard>,
  };
}

function cyriaxCount(entry) {
  if (!entry) return 0;
  return Object.keys(entry).filter((k) => !k.startsWith("__") && entry[k]).length;
}

export function SttSection({ data, setData, sectionKey = "sttt" }) {
  const { d, set, activeKey, setActiveKey } = useAdvActiveRegion(data, setData, sectionKey, CYRIAX_REGION_KEYS);
  const [tab, setTab] = useState("activeROM");
  const region = CYRIAX_REGIONS_DATA[activeKey];
  const entry = d[activeKey] || {};
  const counts = {};
  CYRIAX_REGION_KEYS.forEach((k) => (counts[k] = cyriaxCount(d[k])));

  const items = region[tab] || [];

  return (
    <>
      <SectionIntro
        icon="🦴"
        title="STTT — Selective Tissue Tension"
        info="Cyriax's selective tension approach: active movement shows willingness to move, passive movement isolates inert structures (end-feel), resisted testing isolates the contractile unit (muscle/tendon), joint play checks accessory glide."
      />
      <ColorRegionTabs tabs={CYRIAX_REGION_KEYS} activeKey={activeKey} onSelect={setActiveKey} regionsData={CYRIAX_REGIONS_DATA} counts={counts} />

      <div className="rom-card">
        <div className="rom-card-title">
          {region.icon} {region.label}
          <InfoButton title={`${region.label} — reference`} richItem={cyriaxRegionRichItem(region)} />
        </div>

        <div className="category-chip-row">
          {CYRIAX_TABS.map((t) => (
            <button type="button" key={t.id} className={"category-chip" + (tab === t.id ? " category-chip-active" : "")} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {items.length === 0 && <Hint>Nothing catalogued for this tab in this region.</Hint>}

        {tab === "activeROM" &&
          items.map((t) => {
            const normalDeg = Number(String(t.normal).match(/\d+/)?.[0]);
            const deg = entry[t.id + "_deg"];
            const gr = normalDeg && deg ? RESTRICTION_GRADE(Number(deg), normalDeg) : null;
            return (
              <div className="movement-card" key={t.id}>
                <div className="movement-head">
                  <div>
                    <div className="movement-name-row">
                      <span className="movement-name">{t.label}</span>
                      <InfoButton title={t.label} richItem={cyriaxTestRichItem(t)} />
                    </div>
                    <div className="muscle-subtitle">Normal: {t.normal}</div>
                  </div>
                  <div className="movement-lr-col-stack">
                    <input className="value-input" type="number" placeholder="--" value={deg ?? ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_deg"]: e.target.value })} />
                    {gr && (
                      <div className="restriction-bar" title={gr.label}>
                        <div className="restriction-bar-fill" style={{ width: Math.min(100, gr.pct) + "%", background: gr.color }} />
                      </div>
                    )}
                    {gr && <span className="restriction-label" style={{ color: gr.color }}>{gr.label}</span>}
                  </div>
                </div>
                <div className="row-2" style={{ marginTop: 6 }}>
                  <select className="grade-select" value={entry[t.id + "_pain"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_pain"]: e.target.value })}>
                    <option value="">Pain?</option>
                    {CYRIAX_PAIN_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  <select className="grade-select" value={entry[t.id + "_limited"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_limited"]: e.target.value })}>
                    <option value="">Range?</option>
                    {CYRIAX_LIMITED_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}

        {tab === "passiveROM" &&
          items.map((t) => (
            <div className="movement-card" key={t.id}>
              <div className="movement-name-row">
                <span className="movement-name">{t.label}</span>
                <InfoButton title={t.label} richItem={cyriaxTestRichItem(t)} />
              </div>
              <div className="row-2" style={{ marginTop: 6 }}>
                <select className="grade-select" value={entry[t.id + "_ef"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_ef"]: e.target.value })}>
                  <option value="">End-feel?</option>
                  {(t.endfeel_options || CYRIAX_DEFAULT_ENDFEEL).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <select className="grade-select" value={entry[t.id + "_pain"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_pain"]: e.target.value })}>
                  <option value="">Pain?</option>
                  {CYRIAX_PAIN_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}

        {tab === "resistedTests" &&
          items.map((t) => (
            <div className="movement-card" key={t.id}>
              <div className="movement-name-row">
                <span className="movement-name">{t.label}</span>
                <InfoButton title={t.label} richItem={cyriaxTestRichItem(t)} />
              </div>
              <div className="muscle-subtitle">{t.muscle}</div>
              <select className="grade-select" style={{ marginTop: 6, width: "100%" }} value={entry[t.id + "_result"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_result"]: e.target.value })}>
                <option value="">Select result...</option>
                {CYRIAX_RESISTED_RESULTS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}

        {tab === "jointPlay" &&
          items.map((t) => (
            <div className="movement-card" key={t.id}>
              <div className="movement-name-row">
                <span className="movement-name">{t.label}</span>
                <InfoButton title={t.label} richItem={cyriaxTestRichItem(t)} />
              </div>
              <div className="row-2" style={{ marginTop: 6 }}>
                <select className="grade-select" value={entry[t.id + "_grade"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_grade"]: e.target.value })}>
                  <option value="">Kaltenborn grade...</option>
                  {KALTENBORN_GRADES.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <select className="grade-select" value={entry[t.id + "_pain"] || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_pain"]: e.target.value })}>
                  <option value="">Pain?</option>
                  {CYRIAX_PAIN_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}

        <TextArea label="Clinical reasoning notes" value={entry.reasoningNotes} onChange={(v) => set(activeKey, { ...entry, reasoningNotes: v })} placeholder="Tissue hypothesis, next tests, correlation with subjective findings..." />
      </div>
    </>
  );
}

/* ============================================================
   FUNCTIONAL MOVEMENT SCREEN — real per-test setup/observations/
   grading straight from the FMA *_TESTS arrays, rendered through
   one shared compact card (the real app builds 10 bespoke
   components with hand-drawn SVGs; here every region reuses the
   same fast-fill card so the tool stays consistent + quick).
   ============================================================ */
const FMA_GRADE_COLOR = { 0: "#16A34A", 1: "#D97706", 2: "#DC2626" };

// FMA tests already carry a real hand-drawn SVG stick-figure illustration
// (t.svgNormal, from RegionalFunctionalScreens.jsx) -- no Cloudinary photo
// id to hook into the usual SheetHero image slot, so the real illustration
// renders inline in the Perform tab instead of being dropped.
export function fmaRichItem(t) {
  return {
    title: t.label,
    subtitle: t.phase,
    perform: (
      <>
        {t.svgNormal && (
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 10, marginBottom: 10, display: "flex", justifyContent: "center" }}>
            {t.svgNormal}
          </div>
        )}
        <InfoCard icon="👐" label="Setup & procedure" tint="violet">{t.setup}</InfoCard>
      </>
    ),
    interpret: <InfoCard icon="✅" label="Normal pattern" tint="green">{t.normalDesc}</InfoCard>,
  };
}

function fmaCount(entry, tests) {
  if (!entry) return 0;
  return tests.filter((t) => entry[t.id + "_grade"]).length;
}

export function FmaSection({ data, setData, sectionKey = "fma" }) {
  const { d, set, activeKey, setActiveKey } = useAdvActiveRegion(data, setData, sectionKey, FMA_REGION_KEYS);
  const tests = FMA_DATA[activeKey] || [];
  const entry = d[activeKey] || {};
  const counts = {};
  FMA_REGION_KEYS.forEach((k) => (counts[k] = fmaCount(d[k], FMA_DATA[k])));

  return (
    <>
      <SectionIntro icon="🏃" title="Functional Movement Screen" info="Fundamental movement patterns, screened for compensation strategy rather than a pass/fail score — grade each pattern Normal, Compensated, or Abnormal, and note which specific fault was observed." />
      <ColorRegionTabs tabs={FMA_REGION_KEYS} activeKey={activeKey} onSelect={setActiveKey} counts={counts} labelFor={(k) => k} regionsData={undefined} />

      <div className="rom-card">
        <div className="rom-card-title">{activeKey}</div>
        {tests.map((t) => {
          const grade = entry[t.id + "_grade"];
          const gradeIdx = grade ? t.grades.indexOf(grade) : -1;
          return (
            <div className="movement-card" key={t.id}>
              <div className="movement-name-row">
                <span className="movement-name">
                  {t.icon} {t.label}
                </span>
                <InfoButton title={t.label} richItem={fmaRichItem(t)} />
              </div>
              <div className="muscle-subtitle">{t.subtitle}</div>

              {t.observations.map((obs) => {
                const val = entry[t.id + "_" + obs.id];
                const idx = obs.opts.indexOf(val);
                const clue = idx > 0 ? obs.clues[idx] : "";
                return (
                  <div key={obs.id} style={{ marginTop: 8 }}>
                    <select className="grade-select" style={{ width: "100%" }} value={val || ""} onChange={(e) => set(activeKey, { ...entry, [t.id + "_" + obs.id]: e.target.value })}>
                      <option value="">{obs.q}</option>
                      {obs.opts.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    {clue && <Hint>{clue}</Hint>}
                  </div>
                );
              })}

              <div className="chip-mini-row" style={{ marginTop: 10 }}>
                {t.grades.map((g, i) => {
                  const selected = grade === g;
                  const color = FMA_GRADE_COLOR[i];
                  const style = selected ? { background: color, borderColor: color, color: "#fff", fontWeight: 700 } : { borderColor: color + "55", color };
                  return (
                    <button type="button" key={g} className="chip-mini funky-chip" style={style} onClick={() => set(activeKey, { ...entry, [t.id + "_grade"]: selected ? "" : g })}>
                      {["Normal", "Compensated", "Abnormal"][i] || g}
                    </button>
                  );
                })}
              </div>
              {gradeIdx >= 0 && <Hint>{grade}</Hint>}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ============================================================
   SUMMARY FORMATTERS
   ============================================================ */

/* ============================================================
   FASCIA — myofascial line assessment, straight from the same
   FASCIA_REGIONS_DATA / FASCIA_LINES_DATA the old Phase 0.5
   Fascia module renders (2026-09-03, Aditi: "cpa, kinetic chain,
   functional screen, sttt, fascia like in old 0.5 phase does").
   Ortho had no Fascia screen at all before this. Same structure
   as CPA/Kinetic Chain above: coloured region tabs, one card per
   test with its real how-to/treatment in the (i) sheet, and the
   test's own colour-coded options — each option carrying the
   clinical meaning the data itself defines.
   ============================================================ */
function fasciaRichItem(t) {
  const line = FASCIA_LINES_DATA[String(t.line || "").toLowerCase()];
  return {
    title: t.label,
    subtitle: [t.line, t.type].filter(Boolean).join(" · "),
    perform: <InfoCard icon="👐" label="How to perform" tint="violet">{t.how}</InfoCard>,
    reference: line && (
      <>
        <InfoCard icon="🧵" label={`${line.label} — route`} tint="blue">{line.route}</InfoCard>
        {line.restrictions && <InfoCard icon="⚠️" label="Common restrictions" tint="amber">{line.restrictions}</InfoCard>}
        {line.compensation && <InfoCard icon="⛓️" label="Compensation pattern" tint="gray">{line.compensation}</InfoCard>}
      </>
    ),
    interpret: t.treatment && <InfoCard icon="🎯" label="Treatment" tint="green">{t.treatment}</InfoCard>,
  };
}

function fasciaCount(entry, tests) {
  if (!entry) return 0;
  return (tests || []).filter((t) => entry[t.id]).length;
}

export function FasciaSection({ data, setData, sectionKey = "fascia" }) {
  const { d, set, activeKey, setActiveKey } = useAdvActiveRegion(data, setData, sectionKey, FASCIA_REGION_KEYS);
  const region = FASCIA_REGIONS_DATA[activeKey];
  const entry = d[activeKey] || {};
  const counts = {};
  FASCIA_REGION_KEYS.forEach((k) => (counts[k] = fasciaCount(d[k], FASCIA_REGIONS_DATA[k]?.tests)));
  const selectedMeaning = (t) => (t.options || []).find((o) => o.val === entry[t.id])?.meaning;

  return (
    <>
      <SectionIntro icon="🧵" title="Fascia" info="Myofascial line assessment: fascia transmits force along continuous lines, so a restriction in one segment shows up as symptoms further along the chain. Screen globally first, then test the line the pattern points to." />
      <ColorRegionTabs tabs={FASCIA_REGION_KEYS} activeKey={activeKey} onSelect={setActiveKey} regionsData={FASCIA_REGIONS_DATA} counts={counts} />
      {region?.intro && <Hint>{region.intro}</Hint>}
      <div className="rom-card">
        <div className="rom-card-title">{region?.label || activeKey}</div>
        {(region?.tests || []).map((t) => (
          <div className="movement-card" key={t.id}>
            <div className="movement-name-row">
              <span className="movement-name">{t.label}</span>
              <InfoButton title={t.label} richItem={fasciaRichItem(t)} />
            </div>
            <div className="muscle-subtitle">{[t.line, t.type].filter(Boolean).join(" · ")}</div>
            <OptionChips options={t.options || []} value={entry[t.id]} onChange={(v) => set(activeKey, { ...entry, [t.id]: v })} />
            {selectedMeaning(t) && <div className="obj-card-reason">{selectedMeaning(t)}</div>}
          </div>
        ))}
      </div>
    </>
  );
}

export function formatFasciaSection(sectionData) {
  const rows = [];
  FASCIA_REGION_KEYS.forEach((k) => {
    const entry = sectionData?.[k];
    if (!entry) return;
    (FASCIA_REGIONS_DATA[k]?.tests || []).forEach((t) => {
      if (entry[t.id]) rows.push({ label: `${FASCIA_REGIONS_DATA[k].label} — ${t.label}`, value: entry[t.id] });
    });
  });
  return rows;
}

export function formatKineticChainSection(sectionData) {
  const rows = [];
  KC_REGION_KEYS.forEach((k) => {
    const entry = sectionData?.[k];
    if (!entry) return;
    KC_REGIONS[k].tests.forEach((t) => {
      if (entry[t.id]) rows.push({ label: `${KC_REGIONS[k].label} — ${t.label}`, value: entry[t.id] });
    });
  });
  return rows;
}

export function formatCpaSection(sectionData) {
  const rows = [];
  NKT_REGION_KEYS.forEach((k) => {
    const entry = sectionData?.[k];
    if (!entry) return;
    NKT_REGIONS[k].tests.forEach((t) => {
      if (entry[t.id]) rows.push({ label: `${NKT_REGIONS[k].label} — ${t.label}`, value: entry[t.id] });
    });
  });
  return rows;
}

export function formatSttSection(sectionData) {
  const rows = [];
  CYRIAX_REGION_KEYS.forEach((k) => {
    const entry = sectionData?.[k];
    if (!entry) return;
    const region = CYRIAX_REGIONS_DATA[k];
    ["activeROM", "passiveROM", "resistedTests", "jointPlay"].forEach((tab) => {
      (region[tab] || []).forEach((t) => {
        Object.keys(entry).forEach((key) => {
          if (!key.startsWith(t.id + "_") || !entry[key]) return;
          const field = key.slice(t.id.length + 1);
          rows.push({ label: `${region.label} — ${t.label} (${field})`, value: entry[key] });
        });
      });
    });
    if (entry.reasoningNotes) rows.push({ label: `${region.label} — Reasoning notes`, value: entry.reasoningNotes });
  });
  return rows;
}

// Was: only the bare top-level grade (Normal/Compensated/Abnormal) made it
// into the Summary/Review and any exported report -- the per-observation
// answer and its clinical clue (e.g. "⚠ Pain at initiation — Discogenic /
// SIJ loading — centralisation test"), visible while filling the form,
// never carried through (2026-09-03, Aditi: "previously it shows what it
// means if anything in the four options we selected... give me back the
// interpretation"). Now every answered observation gets its own row with
// the selected finding and its clue, not just the summary grade.
export function formatFmaSection(sectionData) {
  const rows = [];
  FMA_REGION_KEYS.forEach((k) => {
    const entry = sectionData?.[k];
    if (!entry) return;
    (FMA_DATA[k] || []).forEach((t) => {
      const grade = entry[t.id + "_grade"];
      if (grade) rows.push({ label: `${k} — ${t.label}`, value: grade });
      (t.observations || []).forEach((obs) => {
        const val = entry[t.id + "_" + obs.id];
        if (!val) return;
        const idx = obs.opts.indexOf(val);
        const clue = idx > 0 ? obs.clues[idx] : "";
        rows.push({ label: `${k} — ${t.label} — ${obs.q}`, value: clue ? `${val} — ${clue}` : val });
      });
    });
  });
  return rows;
}

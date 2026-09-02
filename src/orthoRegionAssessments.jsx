import React, { useState, useEffect } from "react";
import { SectionIntro, Segmented, TextArea, AddMovementRow, Hint, InfoButton, InfoCard, InfoCardGrid, AnatomyGrid, ProtocolList, useSectionData, Stepper } from "./orthoFieldKit.jsx";
import { ALL_REGIONS, regionDisplayLabel } from "./orthoRegionLibrary.js";
import { ROM_DATA, ROM_REGION_KEYS, RESTRICTION_GRADE, MMT_DATA, MMT_REGION_KEYS, MMT_GRADES, MMT_GRADE_OPTIONS, SPECIAL_TESTS_DATA, SPECIAL_TEST_REGION_KEYS, matchRegionKey, gradeColor } from "./orthoClinicalData.js";

/* ============================================================
   SIMPLE REGION TABS — used by ROM / MMT / Special Tests, whose
   region lists come straight from the real PhysioMind clinical
   data (ROM_DATA / MMT_DATA / SPECIAL_TESTS_DATA) rather than
   the Ortho module's own case-level region picker. Every region
   that dataset knows about is always one tap away; the tab that
   best matches the case's chosen region opens first.
   ============================================================ */
function SimpleRegionTabs({ tabs, activeKey, onSelect, counts, labelFor }) {
  return (
    <div className="region-tab-row-wrap">
      <div className="region-tab-row">
        {tabs.map((k) => {
          const count = counts?.[k] || 0;
          return (
            <button type="button" key={k} className={"region-tab" + (activeKey === k ? " region-tab-active" : "")} onClick={() => onSelect(k)}>
              {labelFor ? labelFor(k) : k}
              {count > 0 && <span className="region-tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Picks (and persists) which of the dataset's own regions is active,
   defaulting to whichever one best matches the case's chosen region. */
function useSimpleRegionTab(data, setData, sectionKey_, tabs, selectedRegions) {
  const [d, set] = useSectionData(data, setData, sectionKey_);
  const defaultKey = selectedRegions.length ? matchRegionKey(selectedRegions[0].id, tabs) : tabs[0];
  const [activeKey, setActiveKeyState] = useState(d.activeRegion || defaultKey);
  function setActiveKey(k) {
    setActiveKeyState(k);
    set("activeRegion", k);
  }
  return { d, set, activeKey, setActiveKey };
}

/* ============================================================
   ROM — regions/movements/norms straight from ROM_DATA
   (src/PhysioNeuro.jsx). Plain numeric input (not a stepper) +
   a colour-graded restriction bar, matching the real ROM module;
   pain/end-feel stay as quick toggle chips.
   ============================================================ */
const ROM_PAIN_OPTIONS = ["No pain", "Painful arc", "End-range pain", "Throughout"];
const END_FEEL_OPTIONS = ["Soft", "Firm", "Hard", "Empty", "Springy"];

function romInfoText(m) {
  const lines = [];
  if (m.start) lines.push(`Start position: ${m.start}`);
  if (m.gonio) lines.push(`Goniometer: ${m.gonio}`);
  if (m.muscles) lines.push(`Prime movers: ${m.muscles}`);
  if (m.endfeel?.normal) lines.push(`Normal end feel: ${m.endfeel.normal}`);
  if (m.endfeel?.abnormal) lines.push(`Abnormal end feel: ${m.endfeel.abnormal}`);
  if (m.compensation) lines.push(`Watch for compensation: ${m.compensation}`);
  if (m.capsular) lines.push(`Capsular pattern: ${m.capsular}`);
  if (m.pathology) lines.push(`Pathology correlation: ${m.pathology}`);
  if (m.redflag) lines.push(`⚠ Red flag: ${m.redflag}`);
  return lines.join("\n\n") || "No additional reference notes for this movement.";
}

// Same field set as physiofeed/learn/RomStudy.jsx's toCard(), split across
// Perform/Reference/Interpret tabs (same pattern Cardio/Neuro's Learn panel
// uses) so each tab fits on screen instead of one long scroll.
function romRichItem(m) {
  return {
    image: m.id,
    title: m.mv,
    perform: (
      <>
        <InfoCard icon="📐" label="Goniometer placement" tint="violet">
          {m.gonio}
          {m.start && <div style={{ fontSize: 11.5, color: "#9C9CAE", marginTop: 4 }}>Starting position: {m.start}</div>}
        </InfoCard>
        {m.muscles && <InfoCard icon="💪" label="Muscles" tint="green">{m.muscles}</InfoCard>}
        {m.endfeel && (
          <InfoCard icon="🖐" label="End feel" tint="violet">
            <div><b>Normal:</b> {m.endfeel.normal}</div>
            {m.endfeel.abnormal && <div style={{ marginTop: 4 }}><b>Abnormal:</b> {m.endfeel.abnormal}</div>}
          </InfoCard>
        )}
      </>
    ),
    reference: (m.compensation || m.capsular || m.pediatric || m.geriatric) && (
      <>
        {(m.compensation || m.capsular) && (
          <InfoCardGrid>
            {m.compensation && <InfoCard icon="⚠️" label="Compensation" tint="amber">{m.compensation}</InfoCard>}
            {m.capsular && <InfoCard icon="🔵" label="Capsular pattern" tint="blue">{m.capsular}</InfoCard>}
          </InfoCardGrid>
        )}
        {(m.pediatric || m.geriatric) && (
          <InfoCardGrid>
            {m.pediatric && <InfoCard icon="👶" label="Pediatric" tint="violet">{m.pediatric}</InfoCard>}
            {m.geriatric && <InfoCard icon="👴" label="Geriatric" tint="blue">{m.geriatric}</InfoCard>}
          </InfoCardGrid>
        )}
      </>
    ),
    interpret: (m.pathology || m.redflag) && (
      <>
        {m.pathology && (
          <InfoCard label="Pathology correlation" tint="gray">
            {m.pathology}
            {m.adl && <div style={{ marginTop: 6 }}><b>ADL relevance:</b> {m.adl}</div>}
          </InfoCard>
        )}
        {m.redflag && <InfoCard icon="🚨" label="Red flags" tint="red">{m.redflag}</InfoCard>}
      </>
    ),
  };
}

function romCountFor(entry, movements) {
  if (!entry) return 0;
  let n = 0;
  movements.forEach((m) => {
    const v = entry[m.id];
    if (v && (v.left || v.right)) n++;
  });
  return n;
}

/* The movement row itself (name + L/R degree Stepper) stays always visible
   -- that's the field a therapist fills for every single movement, so
   hiding it behind a tap would just add a click to the most common case.
   Only the pain-quality + end-feel chip rows (secondary detail, not
   filled for every movement) collapse behind their own small toggle,
   reusing the wizard-wide .obj-item-chevron/.obj-item-row-summary styling
   from orthoStyles.js so it still reads as the same interaction pattern
   as Suggested Objective, just scoped to the one sub-section that was
   actually adding bulk to every row.

   The degree fields are a Stepper (+/- one degree at a time, same control
   Treatment Techniques uses for sets/duration/frequency) pre-loaded to the
   movement's own normal value as a starting point to nudge from, rather
   than a blank box demanding an exact number typed from scratch -- typing
   the exact value directly still works, the Stepper's box is a real,
   always-editable number field. */
function RomMovementCard({ m, val, gradeL, gradeR, pain, endFeel, norm, onSetVal, onSetMeta }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const detailSummary = [pain, endFeel].filter(Boolean).join(" · ");
  return (
    <div className="rom-row">
      <div className="rom-row-grid">
        <div className="rom-row-name">
          <span className="movement-name">{m.mv}</span>
          <InfoButton title={m.mv} text={romInfoText(m)} richItem={romRichItem(m)} />
          {norm && <span className="rom-norm">{norm}</span>}
        </div>
        <div className="rom-row-cell">
          <Stepper value={val.left ?? (m.normal != null ? String(m.normal) : "")} onChange={(v) => onSetVal(m.id, "left", v)} min={0} max={m.normal ? m.normal * 2 : 180} />
          {gradeL && <span className="restriction-label" style={{ color: gradeL.color }}>{gradeL.label}</span>}
        </div>
        <div className="rom-row-cell">
          {m.bilateral !== false && (
            <>
              <Stepper value={val.right ?? (m.normal != null ? String(m.normal) : "")} onChange={(v) => onSetVal(m.id, "right", v)} min={0} max={m.normal ? m.normal * 2 : 180} />
              {gradeR && <span className="restriction-label" style={{ color: gradeR.color }}>{gradeR.label}</span>}
            </>
          )}
        </div>
      </div>
      <div className="obj-item-row rom-detail-toggle" onClick={() => setDetailOpen((o) => !o)} role="button">
        <span className="obj-item-row-sub">Pain quality &amp; end feel</span>
        <div className="obj-item-row-right">
          {!detailOpen && detailSummary && <span className="obj-item-row-summary">{detailSummary}</span>}
          <span className={"obj-item-chevron" + (detailOpen ? " open" : "")}>⌄</span>
        </div>
      </div>
      {detailOpen && (
        <>
          <div className="chip-mini-row">
            {ROM_PAIN_OPTIONS.map((o) => (
              <button type="button" key={o} className={"chip-mini" + (pain === o ? " chip-mini-active" : "")} onClick={() => onSetMeta(m.id, "pain", o)}>
                {o}
              </button>
            ))}
          </div>
          <div className="chip-mini-row">
            {END_FEEL_OPTIONS.map((o) => (
              <button type="button" key={o} className={"chip-mini" + (endFeel === o ? " chip-mini-active" : "")} onClick={() => onSetMeta(m.id, "ef", o)}>
                {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function RomSection({ data, setData, selectedRegions, sectionKey = "rom" }) {
  const { d, set, activeKey, setActiveKey } = useSimpleRegionTab(data, setData, sectionKey, ROM_REGION_KEYS, selectedRegions);
  const movements = ROM_DATA[activeKey] || [];
  const entry = d[activeKey] || {};
  const mode = entry.mode || "arom";
  const extraMovements = entry.extraMovements || [];
  const allMovements = [...movements, ...extraMovements.map((name, i) => ({ id: "extra_" + i, mv: name, bilateral: true, plane: "", normal: null, unit: "°" }))];

  const counts = {};
  ROM_REGION_KEYS.forEach((k) => (counts[k] = romCountFor(d[k], ROM_DATA[k] || [])));

  function setVal(mId, side, val) {
    const cur = entry[mId] || {};
    set(activeKey, { ...entry, [mId]: { ...cur, [side]: val } });
  }
  function setMeta(mId, field, val) {
    set(activeKey, { ...entry, [mId + "_" + field]: entry[mId + "_" + field] === val ? "" : val });
  }

  return (
    <>
      <SectionIntro icon="📐" title="Range of Motion" info="Goniometer aligned with the joint axis; stabilize proximally, measure actively first, then passively. Compare to the contralateral side where possible." />
      <SimpleRegionTabs tabs={ROM_REGION_KEYS} activeKey={activeKey} onSelect={setActiveKey} counts={counts} />

      <div className="rom-card">
        <div className="rom-card-title">{activeKey}</div>
        <Segmented options={["Active", "Passive", "Resisted"]} value={mode === "arom" ? "Active" : mode === "prom" ? "Passive" : "Resisted"} onChange={(v) => set(activeKey, { ...entry, mode: v === "Active" ? "arom" : v === "Passive" ? "prom" : v === "Resisted" ? "resisted" : "arom" })} />

        <div className="rom-row-grid rom-table-head">
          <span>Movement</span>
          <span>L</span>
          <span>R</span>
        </div>

        {allMovements.map((m) => {
          const val = entry[m.id] || {};
          const gradeL = m.normal ? RESTRICTION_GRADE(Number(val.left), m.normal) : null;
          const gradeR = m.normal ? RESTRICTION_GRADE(Number(val.right), m.normal) : null;
          const pain = entry[m.id + "_pain"];
          const endFeel = entry[m.id + "_ef"];
          const norm = [m.plane, m.normal != null ? `N=${m.normal}${m.unit || "°"}` : null].filter(Boolean).join(" · ");
          return (
            <RomMovementCard
              key={m.id}
              m={m}
              val={val}
              gradeL={gradeL}
              gradeR={gradeR}
              pain={pain}
              endFeel={endFeel}
              norm={norm}
              onSetVal={setVal}
              onSetMeta={setMeta}
            />
          );
        })}
        <AddMovementRow onAdd={(name) => set(activeKey, { ...entry, extraMovements: [...extraMovements, name] })} placeholder="+ Add movement" />
        <TextArea label="ROM notes" value={entry.notes} onChange={(v) => set(activeKey, { ...entry, notes: v })} />
      </div>
    </>
  );
}

/* ============================================================
   MMT — regions/muscles/grades straight from MMT_DATA (src/
   PhysioNeuro.jsx). Grade is entered via a dropdown carrying the
   full clinical scale (5, 4+, 4, 4-, ... 0, NT), exactly as the
   real MMT module does — not a stepper.
   ============================================================ */
function mmtInfoText(m) {
  const lines = [];
  if (m.action) lines.push(`Action: ${m.action}`);
  if (m.patient) lines.push(`Patient position: ${m.patient}`);
  if (m.therapist) lines.push(`Therapist / hand placement: ${m.therapist}`);
  if (m.resistance) lines.push(`Resistance: ${m.resistance}`);
  if (m.gravElim) lines.push(`Gravity-eliminated position: ${m.gravElim}`);
  if (m.palpation) lines.push(`Palpation: ${m.palpation}`);
  if (m.origin || m.insertion) lines.push(`Origin → Insertion: ${m.origin || "—"} → ${m.insertion || "—"}`);
  return lines.join("\n\n") || "No additional reference notes for this muscle.";
}

// Same field set/order as physiofeed/learn/MmtStudy.jsx's toCard() -- the
// rich "How to perform" sheet content for an MMT muscle.
function mmtRichItem(m) {
  return {
    image: m.id,
    title: m.muscle,
    subtitle: m.action,
    perform: (
      <ProtocolList items={[
        ["Patient position", m.patient, "👤"], ["Therapist", m.therapist, "🙌"],
        ["Resistance", m.resistance, "↕️"], ["Gravity eliminated", m.gravElim, "⬇️"],
        ["Palpation", m.palpation, "👆"],
      ]} />
    ),
    reference: <AnatomyGrid items={[["Action", m.action], ["Nerve", m.nerve], ["Root", m.root], ["Origin", m.origin], ["Insertion", m.insertion]]} />,
    interpret: (m.compensation || m.substitution || m.functional || m.chain) && (
      <>
        {(m.compensation || m.substitution) && (
          <InfoCard icon="⚠️" label="Compensation / substitution" tint="amber">
            {m.compensation && <div><b>Compensation:</b> {m.compensation}</div>}
            {m.substitution && <div style={{ marginTop: 4 }}><b>Substitution:</b> {m.substitution}</div>}
          </InfoCard>
        )}
        {(m.functional || m.chain) && (
          <InfoCard icon="⛓️" label="Clinical interpretation" tint="violet">
            {m.functional && <div>{m.functional}</div>}
            {m.chain && <div style={{ fontStyle: "italic", color: "#9C9CAE", marginTop: 4 }}>{m.chain}</div>}
          </InfoCard>
        )}
      </>
    ),
  };
}

function mmtCountFor(entry, muscles) {
  if (!entry) return 0;
  let n = 0;
  muscles.forEach((m) => {
    const v = entry[m.id];
    if (v && (v.left || v.right)) n++;
  });
  return n;
}

function GradeSelect({ value, onChange }) {
  const color = gradeColor(value);
  return (
    <select
      className="grade-select"
      style={color ? { borderColor: color, background: color + "1a", color } : undefined}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">--</option>
      {MMT_GRADE_OPTIONS.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  );
}

export function MmtSection({ data, setData, selectedRegions, sectionKey = "mmt" }) {
  const { d, set, activeKey, setActiveKey } = useSimpleRegionTab(data, setData, sectionKey, MMT_REGION_KEYS, selectedRegions);
  const muscles = MMT_DATA[activeKey] || [];
  const entry = d[activeKey] || {};
  const extraMuscles = entry.extraMuscles || [];
  const allMuscles = [...muscles, ...extraMuscles.map((name, i) => ({ id: "extra_" + i, muscle: name }))];

  const counts = {};
  MMT_REGION_KEYS.forEach((k) => (counts[k] = mmtCountFor(d[k], MMT_DATA[k] || [])));

  return (
    <>
      <SectionIntro icon="💪" title="Manual Muscle Testing" />
      <div className="mmt-scale-bar">
        <span className="mmt-scale-label">MMT SCALE</span>
        <span>5 Normal → 0 Zero</span>
        <InfoButton
          title="MMT Grading Scale"
          text={MMT_GRADES.map((g) => `${g.g} — ${g.label}: ${g.desc}`).join("\n")}
        />
      </div>
      <SimpleRegionTabs tabs={MMT_REGION_KEYS} activeKey={activeKey} onSelect={setActiveKey} counts={counts} />

      <div className="rom-card">
        <div className="rom-card-title">{activeKey}</div>
        {allMuscles.map((m) => {
          const val = entry[m.id] || {};
          return (
            <div className="movement-card" key={m.id}>
              <div className="movement-head">
                <div className="movement-info">
                  <div className="movement-name-row">
                    <span className="movement-name">{m.muscle}</span>
                    <InfoButton title={m.muscle} text={mmtInfoText(m)} richItem={mmtRichItem(m)} />
                  </div>
                  {(m.nerve || m.root) && <div className="muscle-subtitle">{[m.nerve, m.root].filter(Boolean).join(" · ")}</div>}
                </div>
                <div className="movement-lr">
                  <div className="movement-lr-col">
                    <span className="movement-lr-tag">L</span>
                    <GradeSelect value={val.left} onChange={(v) => set(activeKey, { ...entry, [m.id]: { ...val, left: v } })} />
                  </div>
                  <div className="movement-lr-col">
                    <span className="movement-lr-tag">R</span>
                    <GradeSelect value={val.right} onChange={(v) => set(activeKey, { ...entry, [m.id]: { ...val, right: v } })} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <AddMovementRow onAdd={(name) => set(activeKey, { ...entry, extraMuscles: [...extraMuscles, name] })} placeholder="+ Add muscle" />
      </div>
    </>
  );
}

/* ============================================================
   JOINT MOBILITY — no equivalent in the real app; keeps the
   Ortho module's own case-level region picker (Right/Left/
   Bilateral etc.) since this section isn't grading a fixed norm.
   ============================================================ */
function regionKey(r) {
  return r.id + "__" + (r.side || "");
}

function AddRegionPopover({ onAdd, onClose }) {
  return (
    <div className="select-popover region-add-popover">
      <div className="popover-head">
        <span>Add a region</span>
        <button type="button" className="popover-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="popover-list">
        {ALL_REGIONS.map((r) => (
          <button type="button" key={r.id} className="popover-item" onClick={() => onAdd(r)}>
            <span>{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RegionTabBar({ regions, activeKey, onSelect, onAdd, counts }) {
  const [addOpen, setAddOpen] = useState(false);
  return (
    <div className="region-tab-row-wrap">
      <div className="region-tab-row">
        {regions.map((r) => {
          const key = regionKey(r);
          const label = [r.side, regionDisplayLabel(r)].filter(Boolean).join(" ");
          const count = counts?.[key] || 0;
          return (
            <button type="button" key={key} className={"region-tab" + (activeKey === key ? " region-tab-active" : "")} onClick={() => onSelect(key)}>
              {label}
              {count > 0 && <span className="region-tab-badge">{count}</span>}
            </button>
          );
        })}
        <button type="button" className="region-tab region-tab-add" onClick={() => setAddOpen((o) => !o)}>
          + Region
        </button>
      </div>
      {addOpen && (
        <AddRegionPopover
          onAdd={(r) => {
            onAdd(r);
            setAddOpen(false);
          }}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}

function useRegionTabs(data, setData, sectionKey_, selectedRegions) {
  const [d, set] = useSectionData(data, setData, sectionKey_);
  const seed = d.__regions && d.__regions.length ? d.__regions : selectedRegions.length ? selectedRegions : [];
  const [regions, setRegions] = useState(seed);
  const [activeKey, setActiveKey] = useState(seed[0] ? regionKey(seed[0]) : null);

  useEffect(() => {
    if (!d.__regions || !d.__regions.length) {
      if (seed.length) set("__regions", seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addRegion(r) {
    if (regions.some((x) => x.id === r.id)) {
      setActiveKey(regionKey(regions.find((x) => x.id === r.id)));
      return;
    }
    const entry = { id: r.id, side: "" };
    const next = [...regions, entry];
    setRegions(next);
    set("__regions", next);
    setActiveKey(regionKey(entry));
  }

  return { d, set, regions, activeKey, setActiveKey, addRegion };
}

export function JointMobilitySection({ data, setData, selectedRegions, sectionKey = "jointMobility" }) {
  const { d, set, regions, activeKey, setActiveKey, addRegion } = useRegionTabs(data, setData, sectionKey, selectedRegions);
  if (!regions.length) {
    return (
      <>
        <SectionIntro icon="🦴" title="Joint Mobility" info="Graded relative to the joint's expected accessory motion — Hypomobile (restricted), Normal, or Hypermobile (excessive)." />
        <RegionTabBar regions={regions} activeKey={activeKey} onSelect={setActiveKey} onAdd={addRegion} />
        <Hint>Tap "+ Region" above to start testing a region.</Hint>
      </>
    );
  }
  const active = regions.find((r) => regionKey(r) === activeKey) || regions[0];
  const key = regionKey(active);
  const label = [active.side, regionDisplayLabel(active)].filter(Boolean).join(" ") || "Region";
  const entry = d[key] || {};

  return (
    <>
      <SectionIntro icon="🦴" title="Joint Mobility" info="Graded relative to the joint's expected accessory motion — Hypomobile (restricted), Normal, or Hypermobile (excessive)." />
      <RegionTabBar regions={regions} activeKey={key} onSelect={setActiveKey} onAdd={addRegion} />
      <div className="rom-card">
        <div className="rom-card-title">{label}</div>
        <Segmented label="Accessory mobility" options={["Hypomobile", "Normal", "Hypermobile"]} value={entry.grade} onChange={(v) => set(key, { ...entry, grade: v })} />
        <TextArea label="Notes" value={entry.notes} onChange={(v) => set(key, { ...entry, notes: v })} />
      </div>
    </>
  );
}

/* ============================================================
   SPECIAL TESTS — categories/tests/result-options straight from
   SPECIAL_TESTS_DATA (src/SubjectiveObjective.jsx). Each test's
   result options are its own (not a generic Positive/Negative/
   Inconclusive) — entered via dropdown; "How to perform" opens
   the same bottom sheet used everywhere else in Ortho.
   ============================================================ */
function testResultEntries(val) {
  if (!val) return [];
  if (typeof val === "string") return [{ side: null, value: val }];
  return Object.entries(val)
    .filter(([, v]) => v)
    .map(([side, value]) => ({ side, value }));
}

function specialTestCountFor(entry, tests) {
  if (!entry) return 0;
  let n = 0;
  tests.forEach((t) => {
    if (testResultEntries(entry[t.id]).length) n++;
  });
  return n;
}

function isPositiveResult(val) {
  if (!val) return false;
  return /positive|\+ve|grade|deficit|refer|rupture|tear|instability|severe/i.test(val);
}

/* No `category` field exists on SPECIAL_TESTS_DATA (that only lives on the
   older, smaller orthoRegionLibrary.js dataset) — classify from label/
   structure text so the category chip row still has something real to
   filter on. */
function categoryFor(test) {
  const hay = `${test.label} ${test.structure || ""}`.toLowerCase();
  if (/nerve root|radicul|disc|dermatom|neural/.test(hay)) return "Disc / Nerve";
  if (/instabil|laxity|dislocat|subluxat/.test(hay)) return "Instability";
  if (/ligament|meniscus|drawer|stress test|varus stress|valgus stress/.test(hay)) return "Ligament / Meniscus";
  return "Other";
}

// Same field set/order as physiofeed/learn/SpecialStudy.jsx's toCard() --
// the rich "How to perform" sheet content for a special test.
function specialRichItem(t) {
  return {
    image: t.id,
    title: t.label,
    subtitle: t.structure,
    perform: t.how && <InfoCard icon="👐" label="How to perform" tint="amber">{t.how}</InfoCard>,
    reference: (t.sensitivity || t.specificity) && (
      <div style={{ fontSize: 13, color: "#1A1A2E" }}>Sensitivity: <b>{t.sensitivity || "—"}</b> · Specificity: <b>{t.specificity || "—"}</b></div>
    ),
    interpret: (t.negative || t.positive) && (
      <InfoCardGrid>
        {t.negative && <InfoCard icon="✓" label="Negative means" tint="green">{t.negative}</InfoCard>}
        {t.positive && <InfoCard icon="⚠" label="Positive means" tint="red">{t.positive}</InfoCard>}
      </InfoCardGrid>
    ),
  };
}

function defaultSideFor(activeKey, selectedRegions) {
  const match = selectedRegions.find((r) => r.id === activeKey);
  const s = (match?.side || "").toLowerCase();
  return s === "left" ? "left" : s === "bilateral" ? "bilateral" : "right";
}

export function SpecialTestsSection({ data, setData, selectedRegions, sectionKey = "specialTests" }) {
  const { d, set, activeKey, setActiveKey } = useSimpleRegionTab(data, setData, sectionKey, SPECIAL_TEST_REGION_KEYS, selectedRegions);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const region = SPECIAL_TESTS_DATA[activeKey];
  const tests = region?.tests || [];
  const entry = d[activeKey] || {};
  const extraTests = entry.extraTests || [];
  const allTests = [...tests, ...extraTests.map((name, i) => ({ id: "extra_" + i, label: name, options: ["Negative", "Positive"] }))];
  const query = q.trim().toLowerCase();
  const categories = ["All", ...Array.from(new Set(allTests.map(categoryFor)))];
  const visibleTests = allTests.filter((t) => (!query || t.label.toLowerCase().includes(query) || (t.structure || "").toLowerCase().includes(query)) && (category === "All" || categoryFor(t) === category));

  const counts = {};
  SPECIAL_TEST_REGION_KEYS.forEach((k) => (counts[k] = specialTestCountFor(d[k], SPECIAL_TESTS_DATA[k]?.tests || [])));

  const isSideless = ALL_REGIONS.find((r) => r.id === activeKey)?.sideless;
  const defaultSide = defaultSideFor(activeKey, selectedRegions || []);
  const answeredCount = allTests.filter((t) => testResultEntries(entry[t.id]).length).length;
  const totalCount = allTests.length;

  return (
    <>
      <SectionIntro icon="🔬" title="Special Tests" info="Perform tests appropriate to the clinical presentation only — a positive test supports, not confirms, a diagnosis." />
      <SimpleRegionTabs tabs={SPECIAL_TEST_REGION_KEYS} activeKey={activeKey} onSelect={setActiveKey} counts={counts} labelFor={(k) => SPECIAL_TESTS_DATA[k]?.label || k} />

      {totalCount > 0 && (
        <div className="test-progress-row">
          <span className="test-progress-label">{region?.label || activeKey}</span>
          <span className="test-progress-count">{answeredCount} of {totalCount}</span>
        </div>
      )}
      {totalCount > 0 && (
        <div className="test-progress-bar">
          <div className="test-progress-fill" style={{ width: `${Math.round((answeredCount / totalCount) * 100)}%` }} />
        </div>
      )}

      <div className="row-2" style={{ marginBottom: showFilters ? 8 : 12 }}>
        <div className="text-input-wrap" style={{ flex: 1 }}>
          <input className="text-input" placeholder="🔍 Search test..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button type="button" className="select-btn" onClick={() => setShowFilters((s) => !s)} aria-label="Toggle category filters">
          ▾ Filter
        </button>
      </div>
      {showFilters && (
        <div className="category-chip-row">
          {categories.map((c) => (
            <button type="button" key={c} className={"category-chip" + (category === c ? " category-chip-active" : "")} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {visibleTests.map((t) => {
        const raw = entry[t.id];
        const currentSide = isSideless ? null : entry[t.id + "__side"] || defaultSide;
        const currentValue = isSideless ? raw : raw && typeof raw === "object" ? raw[currentSide] : undefined;

        function setResult(optionValue) {
          if (isSideless) {
            set(activeKey, { ...entry, [t.id]: optionValue });
            return;
          }
          const obj = raw && typeof raw === "object" ? raw : {};
          set(activeKey, { ...entry, [t.id]: { ...obj, [currentSide]: optionValue } });
        }
        function setSide(s) {
          set(activeKey, { ...entry, [t.id + "__side"]: s });
        }

        return (
          <div className="test-card" key={t.id}>
            <div className="test-card-title-row">
              <div className="test-card-title">{t.label}</div>
              {t.how && <InfoButton title={t.label} text={[t.how, t.positive && `✅ Positive means: ${t.positive}`, t.negative && `⬜ Negative means: ${t.negative}`].filter(Boolean).join("\n\n")} richItem={specialRichItem(t)} />}
            </div>
            {(t.structure || t.sensitivity) && (
              <div className="muscle-subtitle">
                {t.structure && <>Structure: {t.structure}</>}
                {t.sensitivity && <> · Sens: {t.sensitivity} · Spec: {t.specificity}</>}
              </div>
            )}
            {!isSideless && (
              <div className="side-row" style={{ marginTop: 6, marginBottom: 8 }}>
                {["Right", "Left", "Bilateral"].map((s) => (
                  <button type="button" key={s} className={"side-chip" + (currentSide === s.toLowerCase() ? " side-chip-active" : "")} onClick={() => setSide(s.toLowerCase())}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="test-radio-row">
              {(t.options || ["Negative", "Positive"]).map((o) => {
                const active = currentValue === o;
                const positive = isPositiveResult(o);
                return (
                  <button
                    type="button"
                    key={o}
                    className={"test-radio" + (active ? (positive ? " test-radio-selected-red" : " test-radio-selected") : "")}
                    onClick={() => setResult(active ? "" : o)}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <AddMovementRow onAdd={(name) => set(activeKey, { ...entry, extraTests: [...extraTests, name] })} placeholder="+ Add test" />
    </>
  );
}

/* ============================================================
   SUMMARY FORMATTERS — turn the per-region data above into flat
   {label, value} rows for AssessmentSummary (Review page +
   "Copy assessment as text").
   ============================================================ */
export function formatRomSection(sectionData) {
  const rows = [];
  ROM_REGION_KEYS.forEach((regionKeyName) => {
    const entry = sectionData?.[regionKeyName];
    if (!entry) return;
    (ROM_DATA[regionKeyName] || []).forEach((m) => {
      const v = entry[m.id];
      if (!v || (!v.left && !v.right)) return;
      const parts = [];
      if (v.left) parts.push(`L ${v.left}°`);
      if (v.right) parts.push(`R ${v.right}°`);
      rows.push({ label: `${regionKeyName} — ${m.mv}`, value: parts.join(" / ") });
      if (entry[m.id + "_pain"]) rows.push({ label: `${regionKeyName} — ${m.mv} pain`, value: entry[m.id + "_pain"] });
      if (entry[m.id + "_ef"]) rows.push({ label: `${regionKeyName} — ${m.mv} end feel`, value: entry[m.id + "_ef"] });
    });
    if (entry.notes) rows.push({ label: `${regionKeyName} — ROM notes`, value: entry.notes });
  });
  return rows;
}

/* MMT grades are shown as "value/5" — 5 is always the maximum, so a
   grade of "4-" reads as "4-/5", matching how the scale is documented. */
export function formatMmtSection(sectionData) {
  const rows = [];
  MMT_REGION_KEYS.forEach((regionKeyName) => {
    const entry = sectionData?.[regionKeyName];
    if (!entry) return;
    (MMT_DATA[regionKeyName] || []).forEach((m) => {
      const v = entry[m.id];
      if (!v || (!v.left && !v.right)) return;
      const parts = [];
      if (v.left) parts.push(`L ${v.left}/5`);
      if (v.right) parts.push(`R ${v.right}/5`);
      if (parts.length) rows.push({ label: `${regionKeyName} — ${m.muscle}`, value: parts.join(" / ") });
    });
  });
  return rows;
}

export function formatJointMobilitySection(sectionData) {
  const rows = [];
  const regions = sectionData?.__regions || [];
  regions.forEach((r) => {
    const key = regionKey(r);
    const label = [r.side, regionDisplayLabel(r)].filter(Boolean).join(" ") || "Region";
    const entry = sectionData[key] || {};
    if (entry.grade) rows.push({ label, value: entry.grade + (entry.notes ? ` — ${entry.notes}` : "") });
  });
  return rows;
}

export function formatSpecialTestsSection(sectionData) {
  const rows = [];
  SPECIAL_TEST_REGION_KEYS.forEach((regionKeyName) => {
    const entry = sectionData?.[regionKeyName];
    if (!entry) return;
    const region = SPECIAL_TESTS_DATA[regionKeyName];
    const tests = [...(region?.tests || []), ...(entry.extraTests || []).map((name, i) => ({ id: "extra_" + i, label: name }))];
    tests.forEach((t) => {
      const entries = testResultEntries(entry[t.id]);
      if (!entries.length) return;
      const value = entries.map(({ side, value: v }) => (side ? `${side}: ${v}` : v)).join(" / ");
      rows.push({ label: `${region?.label || regionKeyName} — ${t.label}`, value });
    });
  });
  return rows;
}

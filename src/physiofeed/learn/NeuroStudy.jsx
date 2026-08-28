import { useState, useMemo, Fragment } from "react";
import { DERMATOMES, MYOTOMES, REFLEXES, CRANIAL_NERVES } from "../../sharedClinicalData.js";
import { neuroConditionLibraryData } from "../../neuroConditionLibraryData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";
import InfoBox from "./InfoBox.jsx";

const SUB_TABS = [
  { key: "reflexes", label: "Reflexes" },
  { key: "dermatomes", label: "Dermatomes" },
  { key: "myotomes", label: "Myotomes" },
  { key: "cranial", label: "Cranial Nerves" },
  { key: "conditions", label: "Conditions" },
];

// Condition-specific checklist items -- Stroke, Parkinson's, SCI, MS, TBI,
// Vestibular, Neuro-Respiratory, Communication/Bulbar, Peripheral Nerve,
// Ataxia. Same InfoCard perform/scale/interpret shape cardiovascularData.js/
// respiratoryData.js use (see CardioStudy.jsx's toCard for the same
// mapping pattern), not this file's own reflex/dermatome/myotome/cranial
// flat-field shape, since this is a different, newer dataset built for
// NeurologicalAssessment.jsx's in-form ⓘ InfoCards rather than for this
// screen originally.
const CONDITION_BOX_TINTS = { "": "gray", blue: "blue", amber: "amber", purple: "violet" };
function conditionRegionOf(d) {
  return d.category.split("·").pop().trim();
}
const CONDITION_REGIONS = [...new Set(Object.values(neuroConditionLibraryData).map(conditionRegionOf))];
function conditionCard(id, d) {
  return {
    id,
    emoji: d.icon,
    title: d.title,
    subtitle: d.category.replace("Learn · Neuro · ", ""),
    sections: (
      <Fragment>
        {d.perform?.caption && (
          <InfoBox icon="🖐" label="How to perform" tint="blue">{d.perform.caption}</InfoBox>
        )}
        {(d.perform?.boxes || []).map((b, i) => (
          <InfoBox key={i} label={b.label} tint={CONDITION_BOX_TINTS[b.tone] || "gray"}>{b.text}</InfoBox>
        ))}
        {d.scale && (
          <InfoBox icon="📊" label={d.scaleLabel || "Scale"} tint="violet">
            <div className="space-y-1.5">
              {d.scale.rows.map((r, i) =>
                d.scale.type === "meter" ? (
                  <div key={i} className="flex items-start gap-2">
                    <span className="shrink-0 text-[10px] font-bold text-white rounded px-1.5 py-0.5" style={{ background: r.color }}>{r.chip}</span>
                    <div><span className="font-semibold">{r.name}</span> — {r.desc}</div>
                  </div>
                ) : (
                  <div key={i}><span className="font-semibold">{r.k}:</span> {r.v}</div>
                )
              )}
            </div>
          </InfoBox>
        )}
        {d.interpret?.normal && (
          <InfoBox icon="✅" label="Normal" tint="green">
            <ul className="list-disc pl-4 space-y-0.5">{d.interpret.normal.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </InfoBox>
        )}
        {d.interpret?.abnormal && (
          <InfoBox icon="⚠️" label="Abnormal" tint="amber">
            <ul className="list-disc pl-4 space-y-0.5">{d.interpret.abnormal.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </InfoBox>
        )}
        {d.interpret?.redFlags?.length > 0 && (
          <InfoBox icon="🚨" label="Red flags" tint="red">
            <ul className="list-disc pl-4 space-y-0.5">{d.interpret.redFlags.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </InfoBox>
        )}
        {d.interpret?.note && (
          <InfoBox label="Clinical note" tint="gray">{d.interpret.note}</InfoBox>
        )}
      </Fragment>
    ),
  };
}

const REFLEX_GROUPS = ["DTR", "UMN", "Clonus", "LMN"];
const LEVEL_GROUPS = [
  { key: "C", label: "Cervical" },
  { key: "T", label: "Thoracic" },
  { key: "L", label: "Lumbar" },
  { key: "S", label: "Sacral" },
];

// Same real "Test with: ..." instruction shown for every dermatome in the
// actual clinical screen -- fixed, hardcoded copy in that screen (not
// pulled from a per-item field), reused verbatim here rather than
// inventing new wording.
const DERMATOME_TEST_METHOD =
  "Test with: light touch (cotton) + pin-prick at key point. Compare side to side. " +
  "Hyperaesthesia = early irritation; Reduced/Absent = axonal compromise.";

// Splits a comma-separated "test" string into bullets the same way the
// real Cranial Nerve clinical screen already does (bulletizeTest in
// PhysioNeuro.jsx), so multi-part instructions read as a real list, not
// one run-on sentence.
function bulletize(text) {
  if (!text) return [];
  const parts = [];
  let depth = 0, cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.length > 1 ? parts : [text];
}

function reflexCard(r) {
  return {
    id: r.id, image: r.id, title: r.label, subtitle: r.level,
    sections: (
      <Fragment>
        {r.technique && <InfoBox icon="📋" label="Technique" tint="violet">{r.technique}</InfoBox>}
        {r.finding && <InfoBox icon="⚕" label="Clinical finding" tint="amber">{r.finding}</InfoBox>}
      </Fragment>
    ),
  };
}
function dermatomeCard(d) {
  return {
    id: d.id, image: d.id, title: d.level, subtitle: d.region,
    tags: d.disc ? [d.disc] : [],
    sections: (
      <Fragment>
        <InfoBox label="Reference guide" tint="gray">
          {d.disc && <div><span className="font-semibold text-amber-600">Disc level:</span> {d.disc}</div>}
          {d.myotome && <div className="mt-1"><span className="font-semibold text-violet-600">Myotome:</span> {d.myotome}</div>}
          {d.reflex && <div className="mt-1"><span className="font-semibold text-emerald-600">Reflex:</span> {d.reflex}</div>}
          <div className="mt-2 text-slate-600">{DERMATOME_TEST_METHOD}</div>
        </InfoBox>
      </Fragment>
    ),
  };
}
function myotomeCard(m) {
  const id = `myo_${m.level.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
  return {
    id, image: id, title: m.level, subtitle: m.action,
    sections: (
      <Fragment>
        {m.test && <InfoBox icon="🔬" label="Test" tint="violet">{m.test}</InfoBox>}
        {m.compensation && <InfoBox icon="⚠" label="Compensation" tint="amber">{m.compensation}</InfoBox>}
      </Fragment>
    ),
  };
}
function cranialCard(cn) {
  return {
    id: cn.id, image: cn.id, title: `CN ${cn.numeral} — ${cn.name}`,
    sections: (
      <Fragment>
        {cn.test && (
          <InfoBox icon="👐" label="How to perform" tint="violet">
            <ul className="list-disc pl-4 space-y-1">
              {bulletize(cn.test).map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </InfoBox>
        )}
        {cn.note && <InfoBox label="Note" tint="gray">{cn.note}</InfoBox>}
      </Fragment>
    ),
  };
}

// All four datasets are real -- DERMATOMES/MYOTOMES/REFLEXES/CRANIAL_NERVES
// straight from sharedClinicalData.js, same source the real Neurological
// clinical screen uses. Dermatomes genuinely have no technique/how-to-
// perform field in the real data (confirmed) -- rather than invent one,
// they're shown as reference info only (disc/myotome/reflex + the same
// fixed test-method copy production shows for every dermatome).
export default function NeuroStudy({ onBack }) {
  const [subTab, setSubTab] = useState("reflexes");
  const [reflexGroup, setReflexGroup] = useState("DTR");
  const [levelGroup, setLevelGroup] = useState("C");
  const [conditionRegion, setConditionRegion] = useState(CONDITION_REGIONS[0]);
  const [selected, setSelected] = useState(null);

  const reflexCards = useMemo(() => REFLEXES.filter((r) => r.group === reflexGroup).map(reflexCard), [reflexGroup]);
  const dermatomeCards = useMemo(() => DERMATOMES.filter((d) => d.level.startsWith(levelGroup)).map(dermatomeCard), [levelGroup]);
  const myotomeCards = useMemo(() => MYOTOMES.filter((m) => m.level.startsWith(levelGroup)).map(myotomeCard), [levelGroup]);
  const cranialCards = useMemo(() => CRANIAL_NERVES.map(cranialCard), []);
  const conditionCards = useMemo(
    () => Object.entries(neuroConditionLibraryData).filter(([, d]) => conditionRegionOf(d) === conditionRegion).map(([id, d]) => conditionCard(id, d)),
    [conditionRegion]
  );

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}>{selected.sections}</StudyDetail>;

  return (
    <StudyShell
      title="Neurological"
      onBack={onBack}
      regions={SUB_TABS}
      activeRegion={subTab}
      onRegion={setSubTab}
    >
      {subTab === "reflexes" && (
        <>
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
            {REFLEX_GROUPS.map((g) => (
              <button key={g} onClick={() => setReflexGroup(g)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold ${reflexGroup === g ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                {g}
              </button>
            ))}
          </div>
          <StudyGrid items={reflexCards} onSelect={setSelected}/>
        </>
      )}

      {subTab === "dermatomes" && (
        <>
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
            {LEVEL_GROUPS.map((g) => (
              <button key={g.key} onClick={() => setLevelGroup(g.key)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold ${levelGroup === g.key ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                {g.label}
              </button>
            ))}
          </div>
          <StudyGrid items={dermatomeCards} onSelect={setSelected}/>
        </>
      )}

      {subTab === "myotomes" && (
        <>
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
            {LEVEL_GROUPS.map((g) => (
              <button key={g.key} onClick={() => setLevelGroup(g.key)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold ${levelGroup === g.key ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                {g.label}
              </button>
            ))}
          </div>
          <StudyGrid items={myotomeCards} onSelect={setSelected}/>
        </>
      )}

      {subTab === "cranial" && <StudyGrid items={cranialCards} onSelect={setSelected}/>}

      {subTab === "conditions" && (
        <>
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
            {CONDITION_REGIONS.map((r) => (
              <button key={r} onClick={() => setConditionRegion(r)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold ${conditionRegion === r ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                {r}
              </button>
            ))}
          </div>
          <StudyGrid items={conditionCards} onSelect={setSelected}/>
        </>
      )}
    </StudyShell>
  );
}

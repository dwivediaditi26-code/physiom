import { useState, useMemo, Fragment } from "react";
import { DERMATOMES, MYOTOMES, REFLEXES, CRANIAL_NERVES } from "../../sharedClinicalData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";
import InfoBox from "./InfoBox.jsx";

const SUB_TABS = [
  { key: "reflexes", label: "Reflexes" },
  { key: "dermatomes", label: "Dermatomes" },
  { key: "myotomes", label: "Myotomes" },
  { key: "cranial", label: "Cranial Nerves" },
];

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
  const [selected, setSelected] = useState(null);

  const reflexCards = useMemo(() => REFLEXES.filter((r) => r.group === reflexGroup).map(reflexCard), [reflexGroup]);
  const dermatomeCards = useMemo(() => DERMATOMES.filter((d) => d.level.startsWith(levelGroup)).map(dermatomeCard), [levelGroup]);
  const myotomeCards = useMemo(() => MYOTOMES.filter((m) => m.level.startsWith(levelGroup)).map(myotomeCard), [levelGroup]);
  const cranialCards = useMemo(() => CRANIAL_NERVES.map(cranialCard), []);

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
    </StudyShell>
  );
}

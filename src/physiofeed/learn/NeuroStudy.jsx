import { useState, useMemo } from "react";
import { DERMATOMES, MYOTOMES, REFLEXES, CRANIAL_NERVES } from "../../sharedClinicalData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";

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
    technique: r.technique,
    extra: [r.finding && { label: "Clinical finding", value: r.finding }].filter(Boolean),
  };
}
function dermatomeCard(d) {
  return {
    id: d.id, image: d.id, title: d.level, subtitle: d.region,
    extra: [
      d.reflex && { label: "Associated reflex", value: d.reflex },
      d.myotome && { label: "Associated myotome", value: d.myotome },
      d.disc && { label: "Disc level", value: d.disc },
    ].filter(Boolean),
  };
}
function myotomeCard(m) {
  const id = `myo_${m.level.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
  return {
    id, image: id, title: m.level, subtitle: m.action,
    technique: m.test,
    extra: [m.compensation && { label: "Watch for compensation", value: m.compensation }].filter(Boolean),
  };
}
function cranialCard(cn) {
  return {
    id: cn.id, image: cn.id, title: `CN ${cn.numeral} — ${cn.name}`,
    technique: bulletize(cn.test),
    extra: [cn.note && { label: "Note", value: cn.note }].filter(Boolean),
  };
}

// All four datasets are real -- DERMATOMES/MYOTOMES/REFLEXES/CRANIAL_NERVES
// straight from sharedClinicalData.js, same source the real Neurological
// clinical screen uses. Dermatomes genuinely have no technique/how-to-
// perform field in the real data (confirmed) -- rather than invent one,
// they're shown as reference info only (level/reflex/myotome/disc), no
// fabricated "how to perform" text.
export default function NeuroStudy({ onBack }) {
  const [subTab, setSubTab] = useState("reflexes");
  const [reflexGroup, setReflexGroup] = useState("DTR");
  const [levelGroup, setLevelGroup] = useState("C");
  const [selected, setSelected] = useState(null);

  const reflexCards = useMemo(() => REFLEXES.filter((r) => r.group === reflexGroup).map(reflexCard), [reflexGroup]);
  const dermatomeCards = useMemo(() => DERMATOMES.filter((d) => d.level.startsWith(levelGroup)).map(dermatomeCard), [levelGroup]);
  const myotomeCards = useMemo(() => MYOTOMES.filter((m) => m.level.startsWith(levelGroup)).map(myotomeCard), [levelGroup]);
  const cranialCards = useMemo(() => CRANIAL_NERVES.map(cranialCard), []);

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}/>;

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

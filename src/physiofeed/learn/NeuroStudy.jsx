import { useState, useMemo, Fragment } from "react";
import {
  Brain, Activity, Zap, Eye, Wind, Move, Mic, Milestone, Scale, Vibrate,
  Footprints, Route, RotateCw, Gauge, Puzzle,
} from "lucide-react";
import { DERMATOMES, MYOTOMES, REFLEXES, CRANIAL_NERVES } from "../../sharedClinicalData.js";
import { neuroConditionLibraryData } from "../../neuroConditionLibraryData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyImage from "./StudyImage.jsx";
import TabbedDetail from "./TabbedDetail.jsx";
import InfoBox from "./InfoBox.jsx";
import { buildAssessmentQuiz } from "./assessmentQuiz.js";
import { reflexQuestions, dermatomeQuestions, myotomeQuestions, cranialQuestions } from "./neuroQuizBuilders.js";

// One default icon per condition category, replaced by a more specific
// icon below for individual items where a closer match exists -- lucide
// line icons for Learn's study mode only, same treatment CardioStudy.jsx
// gives cardiovascularData.js/respiratoryData.js. The live
// NeurologicalAssessment.jsx in-form ⓘ cards still show the original
// emoji from d.icon, untouched.
const CONDITION_CATEGORY_ICON = {
  "Stroke": Brain,
  "Parkinson's": Vibrate,
  "Spinal Cord Injury": Zap,
  "Multiple Sclerosis": Eye,
  "Traumatic Brain Injury": Brain,
  "Vestibular Disorders": Eye,
  "Neuro-Respiratory": Wind,
  "Communication / Bulbar": Mic,
  "Peripheral Nerve": Zap,
  "Ataxia": Move,
};
const CONDITION_LABEL_ICON = {
  "Freezing of gait": Footprints, "Turning / axial rotation": RotateCw, "Dual-task gait": Puzzle,
  "Functional mobility (stroke)": Footprints, "Transfer ability": Route, "Wheelchair mobility": Route,
  "Sitting balance (SCI)": Scale, "Postural instability (pull test)": Scale,
  "Dynamic Gait Index": Footprints, "Neurological level of injury": Milestone,
  "Hoehn & Yahr staging": Milestone, "ASIA Impairment Scale (AIS)": Milestone,
  "EDSS staging": Milestone, "Rancho Los Amigos level": Milestone,
  "Voice / speech intelligibility": Mic, "Dysarthria screen": Mic,
  "mmrc": Gauge,
};

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
const CONDITION_POOL = Object.entries(neuroConditionLibraryData).map(([id, d]) => ({ id, region: conditionRegionOf(d), d }));
function conditionCard(id, d) {
  const [, label] = id.split("|||");
  const region = conditionRegionOf(d);
  const Icon = CONDITION_LABEL_ICON[label] || CONDITION_CATEGORY_ICON[region] || Brain;
  return {
    id,
    Icon,
    title: d.title,
    subtitle: d.category.replace("Learn · Neuro · ", ""),
    badge: `Conditions • ${region}`,
    media: <div className="py-6 text-violet-500"><Icon size={72} strokeWidth={1.25} aria-hidden="true"/></div>,
    learn: (
      <Fragment>
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
        {d.interpret?.note && <InfoBox label="Clinical note" tint="gray">{d.interpret.note}</InfoBox>}
      </Fragment>
    ),
    technique: (
      <Fragment>
        {d.perform?.caption && <InfoBox icon="🖐" label="How to perform" tint="blue">{d.perform.caption}</InfoBox>}
        {(d.perform?.boxes || []).map((b, i) => (
          <InfoBox key={i} label={b.label} tint={CONDITION_BOX_TINTS[b.tone] || "gray"}>{b.text}</InfoBox>
        ))}
      </Fragment>
    ),
    // Same multi-question quiz Cardio uses (2026-09-19, Aditi: "do neurological
    // and cardio same as rom mmt is shown") -- these used to end on "No quick
    // check for this test yet"; 2026-09-20: several questions from the item's own data.
    quiz: buildAssessmentQuiz(id, d.title, d, region, CONDITION_POOL),
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

const imgMedia = (name) => <StudyImage name={name} full/>;

function reflexCard(r) {
  return {
    id: r.id, image: r.id, title: r.label, subtitle: r.level,
    badge: `Reflexes • ${r.group}`,
    media: imgMedia(r.id),
    learn: (
      <Fragment>
        <InfoBox icon="🎯" label="Root level / nerve" tint="violet">{r.level}</InfoBox>
        {r.finding && <InfoBox icon="⚕" label="Clinical finding" tint="amber">{r.finding}</InfoBox>}
      </Fragment>
    ),
    technique: r.technique ? <InfoBox icon="📋" label="Technique" tint="violet">{r.technique}</InfoBox> : null,
    quiz: reflexQuestions(r, REFLEXES),
  };
}
function dermatomeCard(d) {
  return {
    id: d.id, image: d.id, title: d.level, subtitle: d.region,
    tags: d.disc ? [d.disc] : [],
    badge: "Dermatomes",
    media: imgMedia(d.id),
    learn: (
      <InfoBox label="Reference guide" tint="gray">
        {d.region && <div><span className="font-semibold text-slate-600">Region:</span> {d.region}</div>}
        {d.disc && <div className="mt-1"><span className="font-semibold text-amber-600">Disc level:</span> {d.disc}</div>}
        {d.myotome && <div className="mt-1"><span className="font-semibold text-violet-600">Myotome:</span> {d.myotome}</div>}
        {d.reflex && <div className="mt-1"><span className="font-semibold text-emerald-600">Reflex:</span> {d.reflex}</div>}
      </InfoBox>
    ),
    technique: <InfoBox icon="👆" label="How to test" tint="violet">{DERMATOME_TEST_METHOD}</InfoBox>,
    quiz: dermatomeQuestions(d, DERMATOMES),
  };
}
function myotomeCard(m) {
  const id = `myo_${m.level.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
  return {
    id, image: id, title: m.level, subtitle: m.action,
    badge: "Myotomes",
    media: imgMedia(id),
    learn: <InfoBox icon="💪" label="Movement tested" tint="violet">{m.action}</InfoBox>,
    technique: (m.test || m.compensation) ? (
      <Fragment>
        {m.test && <InfoBox icon="🔬" label="Test" tint="violet">{m.test}</InfoBox>}
        {m.compensation && <InfoBox icon="⚠" label="Compensation" tint="amber">{m.compensation}</InfoBox>}
      </Fragment>
    ) : null,
    quiz: myotomeQuestions(m, MYOTOMES),
  };
}
// CRANIAL_NERVES.id (sharedClinicalData.js) is a bare short id ("cn1",
// "cn346", ...) used elsewhere for exam-field wiring, not a Cloudinary
// asset id -- the real uploaded photos live under the "n_"-prefixed,
// fully-spelled-out ids ("n_cn1", "n_cn3_4_6", ...), same convention as
// every other neuro asset. Map explicitly rather than string-munging so
// this doesn't silently drift if either naming ever changes.
const CRANIAL_IMAGE_ID = {
  cn1: "n_cn1", cn2: "n_cn2", cn346: "n_cn3_4_6", cn5: "n_cn5", cn7: "n_cn7",
  cn8: "n_cn8", cn910: "n_cn9_10", cn11: "n_cn11", cn12: "n_cn12",
};

function cranialCard(cn) {
  const image = CRANIAL_IMAGE_ID[cn.id] || cn.id;
  return {
    id: cn.id, image, title: `CN ${cn.numeral} — ${cn.name}`,
    badge: "Cranial nerves",
    media: imgMedia(image),
    learn: (
      <Fragment>
        <InfoBox icon="🧠" label="Nerve" tint="violet">CN {cn.numeral} — {cn.name}</InfoBox>
        {cn.note && <InfoBox label="Note" tint="gray">{cn.note}</InfoBox>}
      </Fragment>
    ),
    technique: cn.test ? (
      <InfoBox icon="👐" label="How to perform" tint="violet">
        <ul className="list-disc pl-4 space-y-1">
          {bulletize(cn.test).map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </InfoBox>
    ) : null,
    quiz: cranialQuestions(cn, CRANIAL_NERVES),
  };
}

// Second-level filter row under the main chips (reflex group, spinal level,
// condition category). Same pill shape and white/bordered resting state as
// StudyShell's chips, a step smaller, so it reads as a child of that row.
function SubChips({ options, value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
      {options.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${value === o.key ? "bg-violet-100 text-violet-700 border border-violet-300" : "bg-white border border-slate-200 text-slate-500"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
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

  if (selected) {
    const activeCards = subTab === "reflexes" ? reflexCards : subTab === "dermatomes" ? dermatomeCards : subTab === "myotomes" ? myotomeCards : subTab === "cranial" ? cranialCards : conditionCards;
    const idx = activeCards.findIndex((c) => c.id === selected.id);
    const nextCard = idx >= 0 && idx < activeCards.length - 1 ? activeCards[idx + 1] : null;
    return (
      <TabbedDetail
        id={selected.id}
        badge={selected.badge}
        title={selected.title}
        subtitle={selected.subtitle}
        media={selected.media}
        learn={selected.learn}
        technique={selected.technique}
        quiz={selected.quiz}
        next={nextCard ? { label: `Next: ${nextCard.title}`, onClick: () => { setSelected(nextCard); window.scrollTo({ top: 0 }); } } : null}
        onBack={() => setSelected(null)}
      />
    );
  }

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
          <SubChips options={REFLEX_GROUPS.map((g) => ({ key: g, label: g }))} value={reflexGroup} onChange={setReflexGroup}/>
          <StudyGrid items={reflexCards} onSelect={setSelected}/>
        </>
      )}

      {subTab === "dermatomes" && (
        <>
          <SubChips options={LEVEL_GROUPS} value={levelGroup} onChange={setLevelGroup}/>
          <StudyGrid items={dermatomeCards} onSelect={setSelected}/>
        </>
      )}

      {subTab === "myotomes" && (
        <>
          <SubChips options={LEVEL_GROUPS} value={levelGroup} onChange={setLevelGroup}/>
          <StudyGrid items={myotomeCards} onSelect={setSelected}/>
        </>
      )}

      {subTab === "cranial" && <StudyGrid items={cranialCards} onSelect={setSelected}/>}

      {subTab === "conditions" && (
        <>
          <SubChips options={CONDITION_REGIONS.map((r) => ({ key: r, label: r }))} value={conditionRegion} onChange={setConditionRegion}/>
          <StudyGrid items={conditionCards} onSelect={setSelected}/>
        </>
      )}
    </StudyShell>
  );
}

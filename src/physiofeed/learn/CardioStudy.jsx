import { useState, useMemo, Fragment } from "react";
import { cardiovascularData } from "../../cardiovascularData.js";
import { respiratoryData } from "../../respiratoryData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";
import InfoBox from "./InfoBox.jsx";

// Real data straight from cardiovascularData.js/respiratoryData.js -- the
// exact same reference library CardiopulmonaryAssessment.jsx's own ⓘ
// InfoCard buttons already pull from (see e.g. info={cardiovascularData.pulses}
// there). Unlike ROM/MMT's flat fields, these use the richer InfoCard
// perform/scale/interpret shape, so toCard() here maps that shape into the
// same InfoBox sections RomStudy/OutcomeStudy use, instead of reusing their
// field names directly.
const ALL = { ...cardiovascularData, ...respiratoryData };

// Region pills = the category string's last "·"-segment ("Basic
// Examination", "Auscultation", ... ) with a flat "Respiratory" fallback
// for respiratoryData's entries, which don't have a sub-category.
function regionOf(d) {
  const parts = d.category.split("·").map((s) => s.trim());
  return parts.length > 2 ? parts[2] : parts[parts.length - 1];
}
const REGIONS = [...new Set(Object.values(ALL).map(regionOf))];

const BOX_TINTS = { "": "gray", blue: "blue", amber: "amber", purple: "violet" };

function toCard(id, d) {
  return {
    id,
    emoji: d.icon,
    title: d.title,
    subtitle: d.category.replace("Learn · ", ""),
    sections: (
      <Fragment>
        {d.perform?.caption && (
          <InfoBox icon="🖐" label="How to perform" tint="blue">{d.perform.caption}</InfoBox>
        )}
        {(d.perform?.boxes || []).map((b, i) => (
          <InfoBox key={i} label={b.label} tint={BOX_TINTS[b.tone] || "gray"}>{b.text}</InfoBox>
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

export default function CardioStudy({ onBack }) {
  const [region, setRegion] = useState(REGIONS[0]);
  const [selected, setSelected] = useState(null);
  const cards = useMemo(
    () => Object.entries(ALL).filter(([, d]) => regionOf(d) === region).map(([id, d]) => toCard(id, d)),
    [region]
  );

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}>{selected.sections}</StudyDetail>;

  return (
    <StudyShell
      title="Cardio & Respiratory"
      onBack={onBack}
      regions={REGIONS.map((r) => ({ key: r, label: r }))}
      activeRegion={region}
      onRegion={setRegion}
    >
      <StudyGrid items={cards} onSelect={setSelected}/>
    </StudyShell>
  );
}

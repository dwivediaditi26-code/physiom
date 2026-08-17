import { useState, useMemo, Fragment } from "react";
import { MMT_DATA, MMT_REGIONS } from "../../sharedClinicalData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";
import InfoBox from "./InfoBox.jsx";

// Real data from MMT_DATA/MMT_REGIONS -- same source the actual MMT
// clinical screen uses. Detail sections mirror that real screen's own
// expanded card exactly (Anatomy, Testing protocol, Compensation /
// substitution, Clinical interpretation) -- same fields, same order --
// just without the L/R grading selects, since this view is read-only.
function toCard(m) {
  const anatomy = [
    ["Action", m.action], ["Nerve", m.nerve], ["Root", m.root],
    ["Origin", m.origin], ["Insertion", m.insertion],
  ].filter(([, v]) => v);
  const protocol = [
    ["Patient position", m.patient, "👤"], ["Therapist", m.therapist, "🙌"],
    ["Resistance", m.resistance, "↕️"], ["Gravity eliminated", m.gravElim, "⬇️"],
    ["Palpation", m.palpation, "👆"],
  ].filter(([, v]) => v);

  return {
    id: m.id,
    image: m.id,
    title: m.muscle,
    subtitle: m.action,
    tags: [m.nerve, m.root].filter(Boolean),
    sections: (
      <Fragment>
        {anatomy.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {anatomy.map(([lbl, val]) => (
              <div key={lbl} className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{lbl}</div>
                <div className="text-xs text-slate-700 mt-0.5">{val}</div>
              </div>
            ))}
          </div>
        )}
        {protocol.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-2">Testing protocol</div>
            <div className="space-y-1.5">
              {protocol.map(([lbl, val, icon]) => (
                <div key={lbl} className="flex gap-2 items-start bg-slate-50 rounded-lg px-2.5 py-2">
                  <span aria-hidden="true">{icon}</span>
                  <div className="text-xs text-slate-700"><span className="font-semibold text-slate-500">{lbl}: </span>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {(m.compensation || m.substitution) && (
          <InfoBox icon="⚠️" label="Compensation / substitution" tint="amber">
            {m.compensation && <div><span className="font-semibold">Compensation:</span> {m.compensation}</div>}
            {m.substitution && <div className="mt-1"><span className="font-semibold">Substitution:</span> {m.substitution}</div>}
          </InfoBox>
        )}
        {(m.functional || m.chain) && (
          <InfoBox icon="⛓️" label="Clinical interpretation" tint="violet">
            {m.functional && <div>{m.functional}</div>}
            {m.chain && <div className="italic text-slate-500 mt-1">{m.chain}</div>}
          </InfoBox>
        )}
      </Fragment>
    ),
  };
}

export default function MmtStudy({ onBack }) {
  const [region, setRegion] = useState(MMT_REGIONS[0]);
  const [selected, setSelected] = useState(null);
  const cards = useMemo(() => (MMT_DATA[region] || []).map(toCard), [region]);

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}>{selected.sections}</StudyDetail>;

  return (
    <StudyShell
      title="Manual Muscle Testing"
      onBack={onBack}
      regions={MMT_REGIONS.map((r) => ({ key: r, label: r }))}
      activeRegion={region}
      onRegion={setRegion}
    >
      <StudyGrid items={cards} onSelect={setSelected}/>
    </StudyShell>
  );
}

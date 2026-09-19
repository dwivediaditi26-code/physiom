import { useState, useMemo, Fragment } from "react";
import { NKT_REGIONS } from "../../sharedClinicalData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";
import InfoBox from "./InfoBox.jsx";

const REGION_KEYS = Object.keys(NKT_REGIONS);

// Real data from NKT_REGIONS -- same source the Ortho CPA (NKT) step and its
// info cards use. Same card grid as Kinetic Chain / ROM study mode, with the
// read-only detail: how to test, what each result means (Normal /
// Facilitated / Inhibited / Overactive variants), common compensators and
// the treatment protocol.
function toCard(t) {
  return {
    id: t.id,
    title: t.label,
    subtitle: t.muscle,
    tags: [t.type].filter(Boolean),
    sections: (
      <Fragment>
        {t.how && <InfoBox icon="👐" label="How to test" tint="amber">{t.how}</InfoBox>}
        {t.options && t.options.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-2">What each result means</div>
            <div className="space-y-1.5">
              {t.options.map((o, i) => (
                <div key={i} className="rounded-lg border p-2.5" style={{ borderColor: o.color, background: `${o.color}14` }}>
                  <div className="text-xs font-semibold" style={{ color: o.color }}>{o.val}</div>
                  {o.meaning && <div className="text-[11px] text-slate-600 mt-1">{o.meaning}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {t.compensator && <InfoBox icon="🔀" label="Common compensators" tint="violet">{t.compensator}</InfoBox>}
        {t.treatment && <InfoBox icon="🛠" label="Treatment protocol" tint="green">{t.treatment}</InfoBox>}
      </Fragment>
    ),
  };
}

export default function CpaStudy({ onBack }) {
  const [region, setRegion] = useState(REGION_KEYS[0]);
  const [selected, setSelected] = useState(null);
  const bucket = NKT_REGIONS[region];
  const cards = useMemo(() => (bucket?.tests || []).map(toCard), [bucket]);

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}>{selected.sections}</StudyDetail>;

  return (
    <StudyShell
      title="CPA — Compensation Pattern Analysis"
      onBack={onBack}
      regions={REGION_KEYS.map((k) => ({ key: k, label: NKT_REGIONS[k].label }))}
      activeRegion={region}
      onRegion={setRegion}
    >
      {bucket?.intro && <p className="text-xs text-slate-500 mb-3 leading-relaxed">{bucket.intro}</p>}
      <StudyGrid items={cards} onSelect={setSelected}/>
    </StudyShell>
  );
}

import { useState, useMemo, Fragment } from "react";
import { KC_REGIONS } from "../../sharedClinicalData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";
import InfoBox from "./InfoBox.jsx";

const REGION_KEYS = Object.keys(KC_REGIONS);

// Real data from KC_REGIONS -- same source the actual Kinetic Chain
// clinical screen (KineticChainFMS.jsx) uses. Detail sections mirror that
// real screen's own content (How to test, real graded findings with their
// actual clinical meaning, Treatment, kinetic-chain-effect) -- just
// without the result-recording buttons, read-only. No `image`/`emoji` set
// -- these tests don't have an uploaded photo or a per-test icon in the
// real data (only the region itself has a color, not an icon), so the
// grid shows the same honest "no image" placeholder ROM/MMT/Special use
// for any item without real media, rather than inventing one.
function toCard(t) {
  return {
    id: t.id,
    title: t.label,
    subtitle: t.joint,
    tags: [t.role].filter(Boolean),
    sections: (
      <Fragment>
        {t.how && <InfoBox icon="👐" label="How to test" tint="amber">{t.how}</InfoBox>}
        {t.options && t.options.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-2">Findings</div>
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
        {t.treatment && <InfoBox icon="🛠" label="Treatment" tint="green">{t.treatment}</InfoBox>}
        {t.chainEffect && <InfoBox icon="⛓️" label="Kinetic chain effect" tint="violet">{t.chainEffect}</InfoBox>}
      </Fragment>
    ),
  };
}

export default function KineticStudy({ onBack }) {
  const [region, setRegion] = useState(REGION_KEYS[0]);
  const [selected, setSelected] = useState(null);
  const bucket = KC_REGIONS[region];
  const cards = useMemo(() => (bucket?.tests || []).map(toCard), [bucket]);

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}>{selected.sections}</StudyDetail>;

  return (
    <StudyShell
      title="Kinetic Chain"
      onBack={onBack}
      regions={REGION_KEYS.map((k) => ({ key: k, label: KC_REGIONS[k].label }))}
      activeRegion={region}
      onRegion={setRegion}
    >
      {bucket?.intro && <p className="text-xs text-slate-500 mb-3 leading-relaxed">{bucket.intro}</p>}
      <StudyGrid items={cards} onSelect={setSelected}/>
    </StudyShell>
  );
}

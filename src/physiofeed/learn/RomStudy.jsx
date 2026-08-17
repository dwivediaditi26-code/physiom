import { useState, useMemo, Fragment } from "react";
import { ROM_DATA, ROM_REGIONS } from "../../sharedClinicalData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";
import InfoBox from "./InfoBox.jsx";

// Real data straight from ROM_DATA/ROM_REGIONS (same source the actual ROM
// clinical screen uses). Detail sections mirror that real screen's own
// expanded card exactly -- same fields, same order, same icons -- just
// without the angle-entry inputs, since this view is read-only.
function toCard(m) {
  return {
    id: m.id,
    image: m.id,
    title: m.mv,
    tags: [m.plane, `Normal ${m.normal}${m.unit}`].filter(Boolean),
    sections: (
      <Fragment>
        <InfoBox icon="📐" label="Goniometer placement" tint="violet">
          {m.gonio}
          {m.start && <div className="text-xs text-slate-400 mt-1">Starting position: {m.start}</div>}
        </InfoBox>
        {m.muscles && (
          <InfoBox icon="💪" label="Muscles" tint="green">{m.muscles}</InfoBox>
        )}
        {m.endfeel && (
          <InfoBox icon="🖐" label="End feel" tint="violet">
            <div><span className="font-semibold">Normal:</span> {m.endfeel.normal}</div>
            {m.endfeel.abnormal && <div className="text-slate-500 mt-1"><span className="font-semibold">Abnormal:</span> {m.endfeel.abnormal}</div>}
          </InfoBox>
        )}
        {(m.compensation || m.capsular) && (
          <div className="grid grid-cols-2 gap-3">
            {m.compensation && <InfoBox icon="⚠️" label="Compensation" tint="amber">{m.compensation}</InfoBox>}
            {m.capsular && <InfoBox icon="🔵" label="Capsular pattern" tint="blue">{m.capsular}</InfoBox>}
          </div>
        )}
        {m.pathology && (
          <InfoBox label="Pathology correlation" tint="gray">
            {m.pathology}
            {m.adl && <div className="mt-2"><span className="font-semibold">ADL relevance:</span> {m.adl}</div>}
          </InfoBox>
        )}
        {(m.pediatric || m.geriatric) && (
          <div className="grid grid-cols-2 gap-3">
            {m.pediatric && <InfoBox icon="👶" label="Pediatric" tint="violet">{m.pediatric}</InfoBox>}
            {m.geriatric && <InfoBox icon="👴" label="Geriatric" tint="blue">{m.geriatric}</InfoBox>}
          </div>
        )}
        {m.redflag && (
          <InfoBox icon="🚨" label="Red flags" tint="red">{m.redflag}</InfoBox>
        )}
      </Fragment>
    ),
  };
}

export default function RomStudy({ onBack }) {
  const [region, setRegion] = useState(ROM_REGIONS[0]);
  const [selected, setSelected] = useState(null);
  const cards = useMemo(() => (ROM_DATA[region] || []).map(toCard), [region]);

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}>{selected.sections}</StudyDetail>;

  return (
    <StudyShell
      title="Range of Motion"
      onBack={onBack}
      regions={ROM_REGIONS.map((r) => ({ key: r, label: r }))}
      activeRegion={region}
      onRegion={setRegion}
    >
      <StudyGrid items={cards} onSelect={setSelected}/>
    </StudyShell>
  );
}

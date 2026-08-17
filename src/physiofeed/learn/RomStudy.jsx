import { useState, useMemo } from "react";
import { ROM_DATA, ROM_REGIONS } from "../../sharedClinicalData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";

// Real data straight from ROM_DATA/ROM_REGIONS (same source the actual ROM
// clinical screen uses) -- nothing invented. ROM items don't have one
// combined "how to perform" field, so this composes the three real fields
// that together describe it: start position, goniometer placement, prime
// movers.
function toCard(m) {
  return {
    id: m.id,
    image: m.id,
    title: m.mv,
    subtitle: `${m.plane} · Normal ${m.normal}${m.unit}`,
    technique: [
      m.start && `Start: ${m.start}`,
      m.gonio && `Goniometer: ${m.gonio}`,
      m.muscles && `Prime movers: ${m.muscles}`,
    ].filter(Boolean),
    extra: [
      m.endfeel?.normal && { label: "Normal end-feel", value: m.endfeel.normal },
      m.capsular && { label: "Capsular pattern", value: m.capsular },
    ].filter(Boolean),
  };
}

export default function RomStudy({ onBack }) {
  const [region, setRegion] = useState(ROM_REGIONS[0]);
  const [selected, setSelected] = useState(null);
  const cards = useMemo(() => (ROM_DATA[region] || []).map(toCard), [region]);

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}/>;

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

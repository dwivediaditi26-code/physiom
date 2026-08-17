import { useState, useMemo } from "react";
import { MMT_DATA, MMT_REGIONS } from "../../sharedClinicalData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";

// Real data from MMT_DATA/MMT_REGIONS -- same source the actual MMT
// clinical screen uses. No single combined technique field exists, so this
// composes the three real fields that together describe how to test it:
// patient position, therapist position, resistance direction.
function toCard(m) {
  return {
    id: m.id,
    image: m.id,
    title: m.muscle,
    subtitle: m.nerve ? `${m.action} · ${m.nerve}` : m.action,
    technique: [
      m.patient && `Patient: ${m.patient}`,
      m.therapist && `Therapist: ${m.therapist}`,
      m.resistance && `Resistance: ${m.resistance}`,
    ].filter(Boolean),
    extra: [
      m.palpation && { label: "Palpation", value: m.palpation },
      m.functional && { label: "Functional relevance", value: m.functional },
    ].filter(Boolean),
  };
}

export default function MmtStudy({ onBack }) {
  const [region, setRegion] = useState(MMT_REGIONS[0]);
  const [selected, setSelected] = useState(null);
  const cards = useMemo(() => (MMT_DATA[region] || []).map(toCard), [region]);

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}/>;

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

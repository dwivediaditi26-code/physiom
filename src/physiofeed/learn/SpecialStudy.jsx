import { useState, useMemo } from "react";
import { SPECIAL_TESTS_DATA } from "../../sharedClinicalData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";

const REGION_KEYS = Object.keys(SPECIAL_TESTS_DATA);

// Real data from SPECIAL_TESTS_DATA -- same source the actual Special
// Tests clinical screen uses. Unlike ROM/MMT, each test already has one
// real, full "how" field written as proper technique text, plus real
// sensitivity/specificity figures -- used directly, nothing composed.
function toCard(t) {
  return {
    id: t.id,
    image: t.id,
    title: t.label,
    subtitle: t.structure,
    technique: t.how,
    extra: [
      (t.sensitivity || t.specificity) && { label: "Sensitivity / Specificity", value: `${t.sensitivity || "—"} / ${t.specificity || "—"}` },
      t.positive && { label: "Positive sign", value: t.positive },
    ].filter(Boolean),
  };
}

export default function SpecialStudy({ onBack }) {
  const [region, setRegion] = useState(REGION_KEYS[0]);
  const [selected, setSelected] = useState(null);
  const bucket = SPECIAL_TESTS_DATA[region];
  const cards = useMemo(() => (bucket?.tests || []).map(toCard), [bucket]);

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}/>;

  return (
    <StudyShell
      title="Special Tests"
      onBack={onBack}
      regions={REGION_KEYS.map((k) => ({ key: k, label: SPECIAL_TESTS_DATA[k].label }))}
      activeRegion={region}
      onRegion={setRegion}
    >
      <StudyGrid items={cards} onSelect={setSelected}/>
    </StudyShell>
  );
}

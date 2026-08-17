import { useState, useMemo, Fragment } from "react";
import { SPECIAL_TESTS_DATA } from "../../sharedClinicalData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";
import InfoBox from "./InfoBox.jsx";

const REGION_KEYS = Object.keys(SPECIAL_TESTS_DATA);

// Real data from SPECIAL_TESTS_DATA -- same source the actual Special
// Tests clinical screen uses. Detail sections mirror that real screen's
// own expanded card exactly (How to perform, then Negative/Positive
// meaning side by side) -- just without the result-recording select,
// since this view is read-only.
function toCard(t) {
  return {
    id: t.id,
    image: t.id,
    title: t.label,
    subtitle: t.structure,
    tags: [t.sensitivity && `Sens ${t.sensitivity}`, t.specificity && `Spec ${t.specificity}`].filter(Boolean),
    sections: (
      <Fragment>
        {(t.sensitivity || t.specificity) && (
          <div className="text-xs text-slate-500">Sens: {t.sensitivity || "—"} · Spec: {t.specificity || "—"}</div>
        )}
        {t.how && (
          <InfoBox icon="👐" label="How to perform" tint="amber">{t.how}</InfoBox>
        )}
        {(t.negative || t.positive) && (
          <div className="grid grid-cols-2 gap-3">
            {t.negative && <InfoBox icon="✓" label="Negative means" tint="green">{t.negative}</InfoBox>}
            {t.positive && <InfoBox icon="⚠" label="Positive means" tint="red">{t.positive}</InfoBox>}
          </div>
        )}
      </Fragment>
    ),
  };
}

export default function SpecialStudy({ onBack }) {
  const [region, setRegion] = useState(REGION_KEYS[0]);
  const [selected, setSelected] = useState(null);
  const bucket = SPECIAL_TESTS_DATA[region];
  const cards = useMemo(() => (bucket?.tests || []).map(toCard), [bucket]);

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}>{selected.sections}</StudyDetail>;

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

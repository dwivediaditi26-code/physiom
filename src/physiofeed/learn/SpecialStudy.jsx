import { useState, useMemo, Fragment } from "react";
import { SPECIAL_TESTS_DATA } from "../../sharedClinicalData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import InfoBox from "./InfoBox.jsx";
import SpecialTestDetail from "./SpecialTestDetail.jsx";

const REGION_KEYS = Object.keys(SPECIAL_TESTS_DATA);

// Real data from SPECIAL_TESTS_DATA -- same source the actual Special
// Tests clinical screen uses. Detail sections mirror that real screen's
// own expanded card exactly (How to perform, then Negative/Positive
// meaning side by side) -- just without the result-recording select,
// since this view is read-only.
// The data stores "—" for a test with no published sensitivity/specificity.
// That is "unknown", so it shows nothing rather than a "Sens —" pill.
const known = (v) => (v && String(v).trim() !== "—" ? v : null);

function toCard(t) {
  const sens = known(t.sensitivity);
  const spec = known(t.specificity);
  return {
    id: t.id,
    raw: t,
    image: t.id,
    title: t.label,
    subtitle: t.structure,
    tags: [sens && `Sens ${sens}`, spec && `Spec ${spec}`].filter(Boolean),
    sections: (
      <Fragment>
        {(sens || spec) && (
          <div className="text-xs text-slate-500">Sens: {sens || "—"} · Spec: {spec || "—"}</div>
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

  if (selected) {
    return (
      <SpecialTestDetail
        test={selected.raw}
        regionLabel={bucket?.label}
        regionTests={bucket?.tests || []}
        onBack={() => setSelected(null)}
        onNext={(t) => { setSelected(toCard(t)); window.scrollTo({ top: 0 }); }}
      />
    );
  }

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

import { useState, useMemo, Fragment } from "react";
import { SCALES } from "../../sharedClinicalData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import StudyDetail from "./StudyDetail.jsx";
import InfoBox from "./InfoBox.jsx";

// Real data from SCALES -- same source the actual Outcome Measures
// clinical screen uses (a flat dict keyed by scale id, grouped here by its
// own real `category` field into region-style pills, same UX as ROM/MMT's
// region tabs). Detail sections show the real scale info (max score,
// MCID) then every real question/option exactly as the clinical entry
// screen shows them -- just without the answer selects, since this view
// is read-only. `emoji: s.icon` -- these scales don't have an uploaded
// photo, but DO have a real icon already used on the actual screen, so
// StudyGrid/StudyDetail show that instead of a blank "no image" box.
const CATEGORIES = [...new Set(Object.values(SCALES).map((s) => s.category))];

function toCard(s) {
  return {
    id: s.id,
    emoji: s.icon,
    title: s.full,
    subtitle: s.label,
    tags: [s.unit && `Max ${s.maxScore}${s.unit}`, s.mcid != null && `MCID ${s.mcid}`].filter(Boolean),
    sections: (
      <Fragment>
        <InfoBox icon="📋" label="Category" tint="violet">{s.category}</InfoBox>
        {s.fields && s.fields.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-2">Items ({s.fields.length})</div>
            <div className="space-y-1.5">
              {s.fields.map((f) => (
                <div key={f.id} className="bg-slate-50 rounded-lg px-2.5 py-2">
                  <div className="text-xs font-semibold text-slate-700">{f.label}</div>
                  {f.options && f.options.length > 0 && <div className="text-[11px] text-slate-500 mt-1">{f.options.join(" · ")}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Fragment>
    ),
  };
}

export default function OutcomeStudy({ onBack }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selected, setSelected] = useState(null);
  const cards = useMemo(
    () => Object.values(SCALES).filter((s) => s.category === category).map(toCard),
    [category]
  );

  if (selected) return <StudyDetail item={selected} onBack={() => setSelected(null)}>{selected.sections}</StudyDetail>;

  return (
    <StudyShell
      title="Outcome Measures"
      onBack={onBack}
      regions={CATEGORIES.map((c) => ({ key: c, label: c }))}
      activeRegion={category}
      onRegion={setCategory}
    >
      <StudyGrid items={cards} onSelect={setSelected}/>
    </StudyShell>
  );
}

import { useState, useMemo } from "react";
import { PALPATION_DATA, PALPATION_REGIONS } from "../../palpationData.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import PalpationDetail from "./PalpationDetail.jsx";

// Palpation study library, same shell/grid pattern as MmtStudy/RomStudy
// (StudyShell region pills + StudyGrid 2-col tiles), but its own detail
// component (PalpationDetail) since palpation entries carry a 3-image
// slot instead of one hero image, plus fields (attachments, patient/
// therapist position, hand placement, numbered steps) this book's own
// layout doesn't map 1:1 onto MMT's card shape.
//
// Only "Shoulder Girdle" (Chapter 10, Tour #1) has real content so far --
// every field in palpationData.js was OCR'd from the uploaded textbook
// page-by-page (it's a scanned PDF, no text layer) and hand-checked, not
// generated. The rest of the book follows the same process in later
// passes; those regions render as a plain disabled row here rather than
// fake tiles with placeholder copy.
export default function PalpationStudy({ onBack }) {
  const [region, setRegion] = useState("shoulder");
  const [selected, setSelected] = useState(null);

  const cards = useMemo(() => {
    const list = PALPATION_DATA[region] || [];
    return list.map((s) => ({
      id: s.id,
      title: s.name,
      subtitle: `${s.type}${s.position ? ` · ${s.position}` : ""}`,
      tags: [],
      image: null,
      _raw: s,
    }));
  }, [region]);

  if (selected) return <PalpationDetail item={selected} onBack={() => setSelected(null)}/>;

  const availableRegions = PALPATION_REGIONS.filter((r) => r.available);
  const comingSoon = PALPATION_REGIONS.filter((r) => !r.available);

  return (
    <StudyShell
      title="Palpation"
      onBack={onBack}
      regions={availableRegions.map((r) => ({ key: r.key, label: r.label }))}
      activeRegion={region}
      onRegion={setRegion}
    >
      {cards.length > 0 ? (
        <StudyGrid items={cards} onSelect={(c) => setSelected(c._raw)}/>
      ) : (
        <div className="text-sm text-slate-400 text-center py-8">No structures added for this region yet.</div>
      )}

      {comingSoon.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">More regions — being added</div>
          <div className="flex flex-wrap gap-1.5">
            {comingSoon.map((r) => (
              <span key={r.key} className="text-xs font-medium bg-slate-100 text-slate-400 rounded-full px-2.5 py-1">{r.label}</span>
            ))}
          </div>
        </div>
      )}
    </StudyShell>
  );
}

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PALPATION_DATA, PALPATION_REGIONS } from "../../palpationData.js";
import { PALPATION_INTRO_TOPICS } from "./palpationIntroTopics.js";
import StudyShell from "./StudyShell.jsx";
import StudyGrid from "./StudyGrid.jsx";
import PalpationDetail from "./PalpationDetail.jsx";

// General orientation topic (What is palpation? / How to palpate / Normal
// vs abnormal / Clinical precautions) -- same chrome as PalpationDetail's
// text sections, just without the per-structure fields (no attachments,
// no image gallery) since this is technique/theory, not one structure.
function PalpationIntroDetail({ topic, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500 mb-3 -ml-1">
        <ChevronLeft size={18}/> Back
      </button>
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl" aria-hidden="true">{topic.icon}</span>
          <div className="text-xl font-semibold text-slate-900">{topic.title}</div>
        </div>
        <div className="space-y-3">
          {topic.body.map((p, i) => (
            <p key={i} className="text-sm text-slate-700 leading-relaxed">{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const [introTopic, setIntroTopic] = useState(null);

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
  if (introTopic) return <PalpationIntroDetail topic={introTopic} onBack={() => setIntroTopic(null)}/>;

  const availableRegions = PALPATION_REGIONS.filter((r) => r.available);
  const comingSoon = PALPATION_REGIONS.filter((r) => !r.available);

  return (
    // Not using StudyShell's own `regions` prop here -- it renders pills
    // immediately after the title, but the original spec puts the general
    // orientation topics between the title and the body-region picker.
    // StudyShell still supplies the back button/title chrome; the region
    // pill row below is a hand-styled match of its own pill markup so it
    // still looks identical to MMT/ROM's version, just positioned lower.
    <StudyShell title="Palpation" onBack={onBack}>
      {/* General technique orientation -- separate from the per-structure
          "how to palpate" inside each detail card, this covers palpation
          as a skill in general (2026-08-31, Aditi's original spec: "What
          is Palpation? / How to palpate / Normal vs abnormal findings /
          Clinical precautions" above the body-region grid). */}
      <div className="mb-5 rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {PALPATION_INTRO_TOPICS.map((t) => (
          <button key={t.id} onClick={() => setIntroTopic(t)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
            <span className="text-lg" aria-hidden="true">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900">{t.title}</div>
              <div className="text-xs text-slate-500 truncate">{t.summary}</div>
            </div>
            <ChevronRight size={16} className="text-slate-300 flex-shrink-0"/>
          </button>
        ))}
      </div>

      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Body region</div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-0.5">
        {availableRegions.map((r) => (
          <button key={r.key} onClick={() => setRegion(r.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
              region === r.key ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-600"
            }`}>
            {r.label}
          </button>
        ))}
      </div>

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

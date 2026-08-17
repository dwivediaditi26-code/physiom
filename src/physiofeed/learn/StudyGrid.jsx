import { ChevronRight } from "lucide-react";
import StudyImage from "./StudyImage.jsx";

// Overview list -- real bordered cards (not hairline-divided rows), a
// violet accent bar, a bigger rounded thumbnail, and short real-data tag
// pills where the item has genuine discrete fields worth calling out
// (e.g. MMT's nerve + root). Tapping a card opens the full detail page
// for that item (StudyDetail), it does not expand inline.
export default function StudyGrid({ items, onSelect }) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          aria-label={`Open ${item.title}`}
          className="w-full flex items-center gap-3 text-left bg-white border border-slate-200 border-l-[3px] border-l-violet-400 rounded-xl p-2.5"
        >
          <div className="w-[72px] h-[72px] shrink-0 rounded-xl overflow-hidden bg-slate-100">
            <StudyImage name={item.image} square/>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900 truncate">{item.title}</div>
            {item.subtitle && <div className="text-xs text-slate-500 mt-0.5 truncate">{item.subtitle}</div>}
            {item.tags && item.tags.length > 0 && (
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {item.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <ChevronRight size={16} className="text-slate-300 shrink-0"/>
        </button>
      ))}
    </div>
  );
}

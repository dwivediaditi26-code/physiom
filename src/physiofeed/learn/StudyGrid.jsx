import { ChevronRight } from "lucide-react";
import StudyImage from "./StudyImage.jsx";

// Overview list -- small square thumbnail on the left, topic name + a
// short real-data subtitle beside it, one full-width row per item.
// Tapping a row opens the full detail page for that item (StudyDetail),
// it does not expand inline.
export default function StudyGrid({ items, onSelect }) {
  return (
    <div>
      {items.map((item, i) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          aria-label={`Open ${item.title}`}
          className={`w-full flex items-center gap-3 py-2.5 text-left ${i < items.length - 1 ? "border-b border-slate-100" : ""}`}
        >
          <div className="w-[52px] h-[52px] shrink-0 rounded-lg overflow-hidden bg-slate-100">
            <StudyImage name={item.image} square/>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900 truncate">{item.title}</div>
            {item.subtitle && <div className="text-xs text-slate-500 mt-0.5 truncate">{item.subtitle}</div>}
          </div>
          <ChevronRight size={16} className="text-slate-300 shrink-0"/>
        </button>
      ))}
    </div>
  );
}

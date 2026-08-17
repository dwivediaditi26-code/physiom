import { ChevronRight } from "lucide-react";
import StudyImage from "./StudyImage.jsx";

// Overview list -- a real, larger square thumbnail on the left (bigger
// than the small 40-64px avatars production's own compact list rows use,
// since study mode is deliberately the "bigger blocks to learn" view) +
// topic name + a short real-data subtitle beside it, one full-width row
// per item. Tapping a row opens the full detail page for that item
// (StudyDetail), it does not expand inline.
export default function StudyGrid({ items, onSelect }) {
  return (
    <div>
      {items.map((item, i) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          aria-label={`Open ${item.title}`}
          className={`w-full flex items-center gap-3 py-3 text-left ${i < items.length - 1 ? "border-b border-slate-100" : ""}`}
        >
          <div className="w-[76px] h-[76px] shrink-0 rounded-xl overflow-hidden bg-slate-100">
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

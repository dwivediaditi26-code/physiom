import { ChevronLeft } from "lucide-react";
import StudyImage from "./StudyImage.jsx";

// Full detail page for one item -- large image up top, then all its real
// data below. Opened by tapping a tile in StudyGrid; back returns to the
// grid (not all the way out to Learn).
export default function StudyDetail({ item, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500 mb-3 -ml-1">
        <ChevronLeft size={18}/> Back
      </button>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="rounded-t-2xl overflow-hidden">
          <StudyImage name={item.image} height={240}/>
        </div>
        <div className="p-4">
          <div className="text-xl font-semibold text-slate-900">{item.title}</div>
          {item.subtitle && <div className="text-sm font-medium text-violet-600 mt-1">{item.subtitle}</div>}

          {item.technique && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">How to perform</div>
              {Array.isArray(item.technique) ? (
                <ul className="text-sm text-slate-600 leading-relaxed list-disc pl-4 space-y-1.5">
                  {item.technique.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              ) : (
                <div className="text-sm text-slate-600 leading-relaxed">{item.technique}</div>
              )}
            </div>
          )}

          {item.extra && item.extra.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {item.extra.map((row, i) => (
                <div key={i} className="text-sm">
                  <span className="font-semibold text-slate-500">{row.label}: </span>
                  <span className="text-slate-600">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

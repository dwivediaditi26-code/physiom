import { ChevronLeft } from "lucide-react";
import StudyImage from "./StudyImage.jsx";

// Full detail page for one item -- the whole uploaded photo at full size
// (never cropped, unlike the small square list thumbnail), then all of
// its real data below as the same info cards the actual clinical entry
// screen shows for this item, just without the interactive recording
// controls (this view is read-only). Opened by tapping a row in
// StudyGrid; back returns to the grid, not all the way out to Learn.
export default function StudyDetail({ item, onBack, children }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500 mb-3 -ml-1">
        <ChevronLeft size={18}/> Back
      </button>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 flex items-center justify-center" style={item.Icon || item.emoji ? { minHeight: 160 } : undefined}>
          {item.Icon ? (
            <item.Icon size={88} strokeWidth={1.25} className="text-violet-500 py-6" aria-hidden="true"/>
          ) : item.emoji ? (
            <span className="text-8xl py-6" aria-hidden="true">{item.emoji}</span>
          ) : (
            <StudyImage name={item.image} full/>
          )}
        </div>
        <div className="p-4">
          <div className="text-xl font-semibold text-slate-900">{item.title}</div>
          {item.subtitle && <div className="text-sm font-medium text-violet-600 mt-1">{item.subtitle}</div>}
          {children && <div className="mt-4 space-y-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}

import { ChevronLeft } from "lucide-react";

// Shared chrome for every study-mode view: back button + title + a row of
// horizontally-scrollable region/category pills, matching the real
// clinical screens' own region-pill pattern (Cervical/Thoracic/Lumbar/...)
// so this feels consistent with the app students already know.
export default function StudyShell({ title, onBack, regions, activeRegion, onRegion, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} aria-label="Back to Learn" className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <ChevronLeft size={20}/>
        </button>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>

      {regions && regions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-0.5">
          {regions.map((r) => (
            <button
              key={r.key}
              onClick={() => onRegion(r.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                activeRegion === r.key ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}

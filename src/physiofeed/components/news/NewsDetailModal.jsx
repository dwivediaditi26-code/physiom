import { X, Globe2, CalendarClock, ShieldCheck, Bookmark, ExternalLink } from "lucide-react";
import { CATEGORY_LABEL, CATEGORY_COLOR } from "./NewsCard.jsx";

function fullDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// Article detail (2026-09-30, Aditi's Google-News-style redesign brief):
// same bottom-sheet/centered-modal shape as ReportUserModal.jsx, not a new
// pattern. Never presents the AI summary as the original notice -- see the
// disclaimer line, always shown.
export default function NewsDetailModal({ item, saved, onToggleSave, onClose }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4" onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-1 sticky top-0 bg-white">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLOR[item.category] || "bg-slate-50 text-slate-600"}`}>
            {CATEGORY_LABEL[item.category] || item.category}
          </span>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
        </div>

        <div className="px-5 pb-6">
          {item.thumbnail_url && (
            <img src={item.thumbnail_url} alt="" className="w-full h-40 object-cover rounded-2xl my-3 bg-slate-100" />
          )}

          <h2 className="text-lg font-extrabold text-slate-900 leading-snug mb-2">{item.title}</h2>

          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mb-3">
            <span className="flex items-center gap-1"><Globe2 size={12} /> {item.source_name}</span>
            {item.location && <span>{item.location}</span>}
            {item.published_at && <span>Published {fullDate(item.published_at)}</span>}
          </div>

          <div className="flex items-center flex-wrap gap-1.5 mb-4">
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
              <ShieldCheck size={11} /> {item.verification}
            </span>
            {item.deadlineLabel && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-rose-50 text-rose-700">
                <CalendarClock size={11} /> {item.deadlineLabel}
              </span>
            )}
          </div>

          {item.summary && <p className="text-sm text-slate-600 leading-relaxed mb-4">{item.summary}</p>}

          <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3 mb-4">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              AI-organized summary from {item.source_name}. Always check the original notice for complete and current information before acting on it.
            </p>
          </div>

          <p className="text-[10px] text-slate-400 mb-4">Last checked {fullDate(item.last_checked_at)}</p>

          <div className="flex items-center gap-2">
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
            >
              View original notice <ExternalLink size={14} />
            </a>
            <button
              type="button"
              onClick={() => onToggleSave(item)}
              aria-label={saved ? "Remove bookmark" : "Bookmark this"}
              className={`shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center ${saved ? "bg-[#DBEAFE] border-[#2563EB] text-[#2563EB]" : "border-slate-200 text-slate-400"}`}
            >
              <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

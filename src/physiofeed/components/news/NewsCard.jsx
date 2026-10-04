import { Globe2, CalendarClock, ShieldCheck, Bookmark } from "lucide-react";

const CATEGORY_LABEL = {
  job_india: "India Jobs",
  job_international: "International",
  conference: "Conferences",
  regulation: "Rules & Licensing",
  research: "Research",
  alert: "Rules & Licensing",
};

const CATEGORY_COLOR = {
  job_india: "bg-emerald-50 text-emerald-700",
  job_international: "bg-sky-50 text-sky-700",
  conference: "bg-violet-50 text-violet-700",
  regulation: "bg-amber-50 text-amber-700",
  research: "bg-[#DBEAFE] text-[#2563EB]",
  alert: "bg-amber-50 text-amber-700",
};

const DEADLINE_COLOR = {
  "Closes today": "bg-rose-50 text-rose-700",
  "Closes this week": "bg-rose-50 text-rose-700",
  "Upcoming": "bg-emerald-50 text-emerald-700",
};

function timeAgo(iso) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function summaryPreview(text) {
  if (!text) return "";
  const words = text.split(/\s+/);
  return words.length > 34 ? words.slice(0, 34).join(" ") + "…" : text;
}

export default function NewsCard({ item, saved, onToggleSave, onOpen }) {
  return (
    // A <button> wrapping the bookmark <button> below is invalid HTML
    // (nested interactive elements) -- div+role="button" gets the same
    // click/keyboard behavior without nesting one inside the other.
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(item); } }}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:border-[#D9CCFF] transition-colors flex gap-3 cursor-pointer"
    >
      {item.thumbnail_url && (
        <img src={item.thumbnail_url} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0 bg-slate-100" loading="lazy" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLOR[item.category] || "bg-slate-50 text-slate-600"}`}>
            {CATEGORY_LABEL[item.category] || item.category}
          </span>
          {item.deadlineLabel && (
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${DEADLINE_COLOR[item.deadlineLabel] || "bg-slate-50 text-slate-600"}`}>
              <CalendarClock size={11} /> {item.deadlineLabel}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSave(item); }}
            aria-label={saved ? "Remove bookmark" : "Bookmark this"}
            className="ml-auto shrink-0 text-slate-300 hover:text-[#2563EB]"
          >
            <Bookmark size={15} fill={saved ? "#2563EB" : "none"} className={saved ? "text-[#2563EB]" : ""} />
          </button>
        </div>
        <p className="text-sm font-semibold text-slate-800 leading-snug mb-1">{item.title}</p>
        {item.summary && <p className="text-xs text-slate-500 leading-relaxed mb-2">{summaryPreview(item.summary)}</p>}
        <div className="flex items-center justify-between text-[11px] text-slate-400 gap-2">
          <span className="flex items-center gap-1 min-w-0">
            <Globe2 size={11} className="shrink-0" />
            <span className="truncate">{item.source_name}</span>
            {item.location && <span className="shrink-0">· {item.location}</span>}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <ShieldCheck size={11} className="text-emerald-500" /> {timeAgo(item.published_at || item.last_checked_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

export { CATEGORY_LABEL, CATEGORY_COLOR };

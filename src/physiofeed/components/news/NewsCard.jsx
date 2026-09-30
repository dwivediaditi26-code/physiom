import { Globe2, CalendarClock, ShieldCheck, ExternalLink } from "lucide-react";

const CATEGORY_LABEL = {
  job_india: "India job",
  job_international: "International job",
  conference: "Conference",
  regulation: "Regulation",
  research: "Research",
  alert: "Alert",
};

const CATEGORY_COLOR = {
  job_india: "bg-emerald-50 text-emerald-700",
  job_international: "bg-sky-50 text-sky-700",
  conference: "bg-amber-50 text-amber-700",
  regulation: "bg-rose-50 text-rose-700",
  research: "bg-violet-50 text-violet-700",
  alert: "bg-rose-50 text-rose-700",
};

function timeAgo(iso) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NewsCard({ item }) {
  return (
    <a
      href={item.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:border-[#D9CCFF] transition-colors"
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLOR[item.category] || "bg-slate-50 text-slate-600"}`}>
          {CATEGORY_LABEL[item.category] || item.category}
        </span>
        {item.deadlineLabel && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
            <CalendarClock size={11} /> {item.deadlineLabel}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-800 leading-snug mb-1">{item.title}</p>
      {item.summary && <p className="text-xs text-slate-500 leading-relaxed mb-2 line-clamp-3">{item.summary}</p>}
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1 min-w-0">
          <Globe2 size={11} className="shrink-0" />
          <span className="truncate">{item.source_name}</span>
          {item.location && <span className="shrink-0">· {item.location}</span>}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <ShieldCheck size={11} className="text-emerald-500" /> {timeAgo(item.published_at || item.last_checked_at)}
          <ExternalLink size={11} />
        </span>
      </div>
    </a>
  );
}

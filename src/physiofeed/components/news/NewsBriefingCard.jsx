import { Sparkles, ChevronRight } from "lucide-react";

// Built entirely from real, already-loaded rows -- never a separate
// invented "summary of the day". If nothing was published today, says so
// plainly and falls back to the latest verified stories with their real
// dates (Aditi's brief, section D: "Do not invent news or show fictional
// article counts").
function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function readingMinutes(items) {
  const words = items.reduce((sum, it) => sum + (it.summary ? it.summary.split(/\s+/).length : 0) + it.title.split(/\s+/).length, 0);
  return Math.max(1, Math.round(words / 200));
}

export default function NewsBriefingCard({ items, onReadBriefing }) {
  const todays = items.filter((it) => isToday(it.published_at));
  const hasFresh = todays.length > 0;
  const headline = hasFresh ? todays : items.slice(0, 3);
  const top3 = headline.slice(0, 3);

  return (
    <div className="bg-gradient-to-br from-[#DBEAFE] to-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="pf-font-head flex items-center gap-1.5 text-xs font-extrabold text-[#2563EB] uppercase tracking-wide">
          <Sparkles size={13} /> Today's Briefing
        </p>
        {top3.length > 0 && <span className="text-[11px] font-semibold text-[#2563EB]/70">{readingMinutes(top3)} min read</span>}
      </div>

      {!hasFresh && (
        <p className="text-xs font-semibold text-[#1E3A8A] mb-2">No new verified updates today.</p>
      )}

      {top3.length === 0 ? (
        <p className="text-xs text-[#2563EB]/70">Nothing verified yet — check back after the next daily update.</p>
      ) : (
        <ol className="space-y-1.5 mb-3">
          {top3.map((it, i) => (
            <li key={it.id} className="flex items-start gap-2 text-xs font-semibold text-[#2B2140]">
              <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-white/70 text-[#2563EB] text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
              <span className="leading-snug">{it.title}</span>
            </li>
          ))}
        </ol>
      )}

      {top3.length > 0 && (
        <button type="button" onClick={onReadBriefing} className="pf-font-head flex items-center gap-0.5 text-xs font-bold text-[#2563EB]">
          Read briefing <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

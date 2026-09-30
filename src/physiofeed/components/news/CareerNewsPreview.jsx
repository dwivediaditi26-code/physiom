import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Newspaper } from "lucide-react";
import * as db from "../../data/db.js";

// Compact homepage card (2026-09-30, ChatGPT plan: "3-5 fresh updates" on
// the feed, full board lives in Explore -> News). Renders nothing while
// loading or empty rather than an empty-state block -- this sits above the
// composer, a permanent blank card there would read as broken, not "no news".
export default function CareerNewsPreview() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    db.getCareerNews({ limit: 3 }).then((rows) => { if (!cancelled) setItems(rows); }).catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="pf-font-head flex items-center gap-1.5 text-sm font-extrabold text-[#2B2140]">
          <Newspaper size={15} className="text-[#6D28D9]" /> Career & Opportunities
        </p>
        <Link to="/explore" className="pf-font-head flex items-center gap-0.5 text-[11px] font-bold text-[#6D28D9]">
          See all <ChevronRight size={12} />
        </Link>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <a key={item.id} href={item.source_url} target="_blank" rel="noopener noreferrer" className="block">
            <p className="text-xs font-semibold text-slate-700 leading-snug line-clamp-2 hover:underline">{item.title}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{item.source_name}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

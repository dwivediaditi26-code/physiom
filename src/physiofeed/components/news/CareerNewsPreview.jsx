import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Newspaper } from "lucide-react";
import * as db from "../../data/db.js";
import { CATEGORY_LABEL, CATEGORY_COLOR } from "./NewsCard.jsx";

function isNew(iso) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 24 * 3600 * 1000;
}

// Compact homepage card (Aditi's brief, section 8: "up to 2-3 important
// stories... keep the preview visually compact"). Same career_news rows
// the full News page reads -- renders nothing while loading or empty
// rather than a permanent blank card sitting above the composer.
export default function CareerNewsPreview() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    db.getCareerNews().then((rows) => { if (!cancelled) setItems(rows.slice(0, 3)); }).catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="pf-font-head flex items-center gap-1.5 text-sm font-extrabold text-[#2B2140]">
          <Newspaper size={15} className="text-[#2563EB]" /> News & Updates
        </p>
        <Link to="/news" className="pf-font-head flex items-center gap-0.5 text-[11px] font-bold text-[#2563EB]">
          View all <ChevronRight size={12} />
        </Link>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <a key={item.id} href={item.source_url} target="_blank" rel="noopener noreferrer" className="block">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${CATEGORY_COLOR[item.category] || "bg-slate-50 text-slate-600"}`}>
                {CATEGORY_LABEL[item.category] || item.category}
              </span>
              {isNew(item.published_at) && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600">New</span>}
            </div>
            <p className="text-xs font-semibold text-slate-700 leading-snug line-clamp-2 hover:underline">{item.title}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{item.source_name}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

import { forwardRef } from "react";
import { Bookmark, ExternalLink, Share2 } from "lucide-react";
import GradientTile from "../shared/GradientTile.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

const LEVEL_TONE = { "Level 1": "bg-emerald-50 text-emerald-700", "Level 2": "bg-amber-50 text-amber-700", "Level 3": "bg-slate-100 text-slate-600" };

// highlighted + the forwarded ref exist for one caller: EvidencePage.jsx
// scrolling straight to (and briefly ringing) whichever article a Home-
// screen preview card was clicked for, instead of just landing on the
// Evidence tab and leaving the clinician to hunt for it themselves.
const ResearchCard = forwardRef(function ResearchCard({ article, highlighted }, ref) {
  const { saveEvidence } = useAppData();
  return (
    <div ref={ref} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow ${highlighted ? "border-[#FFB020] ring-2 ring-[#FFD98A]" : "border-slate-200"}`}>
      <GradientTile grad={article.grad} className="h-2" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${LEVEL_TONE[article.level] || "bg-slate-100 text-slate-600"}`}>{article.level}</span>
          <span className="text-[10px] font-medium text-slate-400">{article.type} · {article.year}</span>
        </div>
        <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1.5">{article.title}</h3>
        <p className="text-xs text-slate-400 mb-3">{article.journal}</p>
        {article.summary && (
          <div className="mb-2.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Summary</p>
            <p className="text-sm text-slate-600">{article.summary}</p>
          </div>
        )}
        {article.conclusion && (
          <div className="mb-2.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Conclusion</p>
            <p className="text-sm text-slate-600">{article.conclusion}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {article.tags.map((t) => <span key={t} className="text-[10px] font-bold text-[#B0790A] bg-[#FFF4E0] px-1.5 py-0.5 rounded-md">#{t}</span>)}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {article.sourceUrl ? (
            <a href={article.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-[#DB2777] hover:text-[#C2185B]">
              Read on {article.sourceName || "source"} <ExternalLink size={12} />
            </a>
          ) : (
            <span className="text-xs font-medium text-slate-300">Source not linked yet</span>
          )}
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><Share2 size={15} /></button>
            <button onClick={() => saveEvidence(article.id)} className="p-1.5 rounded-lg hover:bg-slate-50">
              <Bookmark size={15} className={article.saved ? "fill-[#FFB020] text-[#FFB020]" : "text-slate-400"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ResearchCard;

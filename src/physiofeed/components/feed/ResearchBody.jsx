import { FlaskConical, ExternalLink } from "lucide-react";

// Renders a post created via ResearchComposer.jsx. Distinct from
// components/evidence/ResearchCard.jsx, which renders a curated
// research_articles row in the Evidence library -- this is a physio's own
// feed post discussing a paper (post.research, mapped in db.js's
// getPosts()), a different table with a different purpose.
export default function ResearchBody({ post }) {
  const r = post.research || {};
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <FlaskConical size={13} className="text-violet-600" />
        <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">Research</span>
      </div>
      <h3 className="font-bold text-slate-900 text-base mb-1">{post.heading}</h3>
      <p className="text-xs text-slate-400 mb-3">{[r.type, r.journal, r.year].filter(Boolean).join(" · ")}</p>

      {r.keyFinding && (
        <div className="mb-2.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Key finding</p>
          <p className="text-sm text-slate-600">{r.keyFinding}</p>
        </div>
      )}
      {r.takeaway && (
        <div className="mb-2.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Clinical takeaway</p>
          <p className="text-sm text-slate-600">{r.takeaway}</p>
        </div>
      )}
      {r.reference && (
        <a href={r.reference} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700">
          View reference <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}

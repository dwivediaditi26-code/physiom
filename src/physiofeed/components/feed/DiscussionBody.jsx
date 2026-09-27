import { MessagesSquare, FileText, Lock } from "lucide-react";
import PostMedia from "./PostMedia.jsx";

// A post shared in "from this assessment" (orthoSummary.jsx/CardiopulmonaryAssessment.jsx/
// NeurologicalAssessment.jsx's own buildShareText) always marks each section
// with a line reading exactly "— Section —" -- deliberate and unique to that
// assembly, never something a clinician would type by hand in a plain
// discussion post. Splitting on just that exact marker (2026-09-27, Aditi:
// "the alignment and the way it is presented") gives those section names
// real visual weight instead of blending into the paragraph, without
// touching the wording of anything the clinician actually typed or the app
// assembled -- still fully verbatim, just laid out.
// A handful of older shares assembled a field's label straight from its raw
// camelCase key (2026-09-27, Aditi: "character pattern location... make it
// capital first letter") instead of a human label -- always as the very
// first word of the line, right before a colon (e.g. "character: Dull,
// Aching"). Capitalizing just that leading letter is safe here specifically
// because it only ever runs on lines already inside a recognized "— Section —"
// block, never on freeform prose a clinician typed.
function capitalizeLabel(line) {
  return line.replace(/^([a-z])([^:\n]{0,30}:\s)/, (_, c1, rest) => c1.toUpperCase() + rest);
}

function captionBlocks(text) {
  const blocks = [];
  let current = [];
  for (const line of (text || "").split("\n")) {
    const m = /^—\s*(.+?)\s*—$/.exec(line.trim());
    if (m) {
      if (current.some((l) => l.trim())) blocks.push({ type: "text", lines: current });
      current = [];
      blocks.push({ type: "header", label: m[1] });
    } else {
      current.push(line);
    }
  }
  if (current.some((l) => l.trim())) blocks.push({ type: "text", lines: current });
  return blocks;
}

// Only the label half of a "Label: value" line gets bolded (2026-09-27,
// Aditi: "not whole bold letter .. only sub topics chief complaint, pain,
// observation") -- the value stays regular weight, both still dark/black
// rather than the previous washed-out grey.
function CaptionLine({ line }) {
  if (!line.trim()) return <div style={{ height: 6 }} />;
  const capped = capitalizeLabel(line);
  const m = /^([^:\n]{1,40}):\s(.*)$/.exec(capped);
  return (
    <div className="text-[15px] text-slate-900 leading-relaxed">
      {m ? <><span className="font-bold">{m[1]}:</span> {m[2]}</> : capped}
    </div>
  );
}

function DiscussionCaption({ text }) {
  if (!text) return null;
  const blocks = captionBlocks(text);
  // No "— Section —" markers at all (an ordinary typed post) -- render
  // exactly as before, one plain paragraph.
  if (blocks.length <= 1 && blocks[0]?.type !== "header") {
    return <p className="text-[15px] text-slate-900 leading-relaxed whitespace-pre-line mb-1">{text}</p>;
  }
  return (
    <div className="mb-1">
      {blocks.map((b, i) =>
        b.type === "header" ? (
          <div key={i} className={"text-[11px] font-bold text-violet-600 uppercase tracking-wide" + (i === 0 ? "" : " mt-3") + " mb-1"}>
            {b.label}
          </div>
        ) : (
          <div key={i}>
            {b.lines.map((line, j) => <CaptionLine key={j} line={line} />)}
          </div>
        )
      )}
    </div>
  );
}

// Renders a post created via DiscussionComposer.jsx -- the paragraph body
// verbatim, exactly as CaseBody.jsx renders its structured sections
// verbatim. Never auto-restructured or summarized (see DiscussionComposer.jsx
// for why). `post.discussion` is the { closed } state mapped in
// db.js's getPosts() from posts.media.discussion.
export default function DiscussionBody({ post, onDoubleTap, burst }) {
  const closed = !!post.discussion?.closed;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <MessagesSquare size={13} className="text-violet-600" />
        <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">Clinical Discussion</span>
        {closed && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 ml-auto">
            <Lock size={10} /> Closed
          </span>
        )}
      </div>
      <h3 className="font-bold text-slate-900 text-base mb-2">{post.heading}</h3>
      <DiscussionCaption text={post.caption} />

      {(post.media === "photo" || post.media === "video") && post.mediaUrls?.length > 0 && (
        <div className="mt-2.5">
          <PostMedia post={post} onDoubleTap={onDoubleTap} burst={burst} size="large" />
        </div>
      )}
      {post.media === "document" && post.mediaUrls?.[0] && (
        <a
          href={post.mediaUrls[0]} target="_blank" rel="noopener noreferrer"
          className="mt-2.5 flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm text-violet-700 hover:bg-violet-50 w-fit"
        >
          <FileText size={16} /> View attached document
        </a>
      )}
    </div>
  );
}

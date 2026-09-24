import { MessagesSquare, FileText, Lock } from "lucide-react";
import PostMedia from "./PostMedia.jsx";

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
      <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-line mb-1">{post.caption}</p>

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

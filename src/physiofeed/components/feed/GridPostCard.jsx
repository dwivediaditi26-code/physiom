import { useState } from "react";
import { Heart, MessageCircle, Bookmark } from "lucide-react";
import PostMedia from "./PostMedia.jsx";
import PostDetailModal from "./PostDetailModal.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

// Condensed post card used on Profile/Saved/Explore grids.
//
// Bug fix (2026-08-19): the comment icon here was a static <div> -- not a
// button, no click handler -- so there was no way to actually read or add
// a comment from these grids, only see a count. That's a smaller, less
// capable experience than the main feed's FeedPostCard.jsx (full comment
// thread + add-comment box) even though it's the SAME underlying post.
// Now opens PostDetailModal.jsx, which renders that exact FeedPostCard,
// so likes/comments behave identically here as on /feed.
//
// Whole-card click (2026-09-22, Aditi: "post should open when we click")
// -- opening a post used to only work by tapping the media itself or the
// comment icon; the caption/tags/timestamp area did nothing. The card is
// now one big button that opens the same modal, with Like/Save as their
// own nested buttons that stopPropagation so tapping them doesn't also
// pop the detail modal open underneath.
export default function GridPostCard({ post }) {
  const { likePost, savePost } = useAppData();
  const [detailOpen, setDetailOpen] = useState(false);
  // Once replies/case-updates share commentList (Clinical Discussion,
  // 2026-09-23) a raw .length here would count them too -- only top-level,
  // non-update entries are real "answers"/comments, same filter
  // FeedPostCard.jsx uses for its own count.
  const commentCount = post.postType === "discussion"
    ? post.commentList.filter((c) => !c.parentId && !c.isCaseUpdate && !c.isFinalUpdate).length
    : post.commentList.length;
  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setDetailOpen(true)}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 text-left cursor-pointer"
      >
        <p className="text-xs text-slate-400 mb-2">{post.time} ago</p>
        {post.media !== "image" && <h3 className="font-semibold text-slate-900 text-sm mb-2">{post.heading}</h3>}
        {/* Clinical Discussion (2026-09-23): most discussions have no photo/
            video, and PostMedia's fallback for a medialess post is a big
            decorative gradient tile -- fine as a colorful post accent
            elsewhere, but wrong for a plain text question (exactly the
            "dashboard-like" look the feature explicitly avoids). Only show
            it here when there's a real attachment to show. */}
        {(post.postType !== "discussion" || post.media === "photo" || post.media === "video") && (
          <PostMedia post={post} size="small" />
        )}
        <p className="text-xs text-slate-600 mt-2.5 line-clamp-2">{post.caption}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {post.tags.map((t) => <span key={t} className="text-[10px] font-bold text-[#B0790A] bg-[#FFF4E0] px-1.5 py-0.5 rounded-md">#{t}</span>)}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-slate-100">
          <button onClick={(e) => { e.stopPropagation(); likePost(post.id); }} className="flex items-center gap-1.5">
            <Heart size={16} className={post.liked ? "fill-rose-500 text-rose-500" : "text-slate-400"} />
            <span className="text-xs text-slate-500">{post.likes}</span>
          </button>
          <span className="flex items-center gap-1.5">
            <MessageCircle size={16} className="text-slate-400" /><span className="text-xs text-slate-500">{commentCount}</span>
          </span>
          <button onClick={(e) => { e.stopPropagation(); savePost(post.id); }} className="ml-auto"><Bookmark size={16} className={post.saved ? "fill-[#FFB020] text-[#FFB020]" : "text-slate-400"} /></button>
        </div>
      </article>
      {detailOpen && <PostDetailModal post={post} onClose={() => setDetailOpen(false)} />}
    </>
  );
}

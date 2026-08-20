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
export default function GridPostCard({ post }) {
  const { likePost, savePost } = useAppData();
  const [detailOpen, setDetailOpen] = useState(false);
  return (
    <>
      <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5">
        <p className="text-xs text-slate-400 mb-2">{post.time} ago</p>
        {post.media !== "image" && <h3 className="font-semibold text-slate-900 text-sm mb-2">{post.heading}</h3>}
        <button onClick={() => setDetailOpen(true)} className="block w-full text-left focus:outline-none">
          <PostMedia post={post} size="small" />
        </button>
        <p className="text-xs text-slate-600 mt-2.5 line-clamp-2">{post.caption}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {post.tags.map((t) => <span key={t} className="text-[10px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md">#{t}</span>)}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-slate-100">
          <button onClick={() => likePost(post.id)} className="flex items-center gap-1.5">
            <Heart size={16} className={post.liked ? "fill-rose-500 text-rose-500" : "text-slate-400"} />
            <span className="text-xs text-slate-500">{post.likes}</span>
          </button>
          <button onClick={() => setDetailOpen(true)} className="flex items-center gap-1.5">
            <MessageCircle size={16} className="text-slate-400" /><span className="text-xs text-slate-500">{post.commentList.length}</span>
          </button>
          <button onClick={() => savePost(post.id)} className="ml-auto"><Bookmark size={16} className={post.saved ? "fill-violet-600 text-violet-600" : "text-slate-400"} /></button>
        </div>
      </article>
      {detailOpen && <PostDetailModal post={post} onClose={() => setDetailOpen(false)} />}
    </>
  );
}

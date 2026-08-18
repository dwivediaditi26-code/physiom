import { useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark, BadgeCheck, UserPlus, Check, Send } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import PostMedia from "./PostMedia.jsx";
import ReportButton from "./ReportButton.jsx";
import CaseBody from "./CaseBody.jsx";
import ResearchBody from "./ResearchBody.jsx";
import PollBody from "./PollBody.jsx";
import { initialsOf } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

export default function FeedPostCard({ post }) {
  const { likePost, savePost, followAuthor, commentOnPost, setCarousel } = useAppData();
  const [commentText, setCommentText] = useState("");
  const [burst, setBurst] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  const handleDoubleTap = (dir) => {
    if (dir === "prev" || dir === "next") {
      // Real multi-photo posts carry their URLs in mediaUrls; demo carousel
      // posts (mockData.js) carry theirs in images. Same index field either way.
      const arr = post.mediaUrls?.length ? post.mediaUrls : post.images;
      const len = arr.length, cur = post.mediaIndex || 0;
      setCarousel(post.id, dir === "next" ? (cur + 1) % len : (cur - 1 + len) % len);
      return;
    }
    if (!post.liked) likePost(post.id);
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
  };

  const submitComment = () => {
    if (!commentText.trim()) return;
    commentOnPost(post.id, commentText.trim());
    setCommentText("");
    setShowAllComments(true);
  };

  const visibleComments = showAllComments ? post.commentList : post.commentList.slice(0, 1);

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-3">
        <Avatar size={38} grad={post.gradient} initials={initialsOf(post.author)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-900 text-sm truncate">{post.author}</span>
            {post.verified && <BadgeCheck size={15} className="text-violet-600 shrink-0" />}
          </div>
          <p className="text-xs text-slate-400">{post.role} · {post.time}</p>
        </div>
        {!post.isSelf && (
          <button onClick={() => followAuthor(post.id)}
            className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-violet-300 ${post.following ? "bg-slate-50 text-slate-500 border border-slate-200" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
            {post.following ? <><Check size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
          </button>
        )}
      </div>

      {post.postType === "case" ? (
        <CaseBody post={post} />
      ) : post.postType === "research" ? (
        <ResearchBody post={post} />
      ) : post.postType === "poll" ? (
        <PollBody post={post} />
      ) : (
        <>
          {post.media !== "image" && post.media !== "photo" && <h3 className="font-bold text-slate-900 text-base mb-2">{post.heading}</h3>}
          <PostMedia post={post} onDoubleTap={handleDoubleTap} burst={burst} size="large" />
          <p className="text-sm text-slate-600 mt-3">{post.caption}</p>
        </>
      )}

      <div className="flex flex-wrap gap-1.5 mt-2">
        {post.tags.map((t) => <span key={t} className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">#{t}</span>)}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={() => likePost(post.id)} className="flex items-center gap-1.5 group focus:outline-none">
            <Heart size={19} className={post.liked ? "fill-rose-500 text-rose-500" : "text-slate-400 group-hover:text-rose-500"} />
            <span className={`text-xs font-medium ${post.liked ? "text-rose-500" : "text-slate-500"}`}>{post.likes}</span>
          </button>
          <span className="flex items-center gap-1.5"><MessageCircle size={19} className="text-slate-400" /><span className="text-xs font-medium text-slate-500">{post.commentList.length}</span></span>
          <button className="flex items-center gap-1.5 group focus:outline-none"><Share2 size={19} className="text-slate-400 group-hover:text-violet-600" /></button>
        </div>
        <div className="flex items-center gap-1">
          {!post.isSelf && <ReportButton postId={post.id} />}
          <button onClick={() => savePost(post.id)} className="focus:outline-none">
            <Bookmark size={19} className={post.saved ? "fill-violet-600 text-violet-600" : "text-slate-400 hover:text-violet-600"} />
          </button>
        </div>
      </div>

      {post.likedByPreview?.length > 0 && (
        <div className="flex items-center gap-2 mt-2.5">
          <div className="flex -space-x-2">
            {post.likedByPreview.slice(0, 3).map((n, i) => (
              <div key={n} className="w-5 h-5 rounded-full ring-2 ring-white overflow-hidden">
                <Avatar size={20} grad={["blue", "rose", "teal"][i % 3]} initials={initialsOf(n)} />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Liked by <span className="font-medium text-slate-700">{post.likedByPreview[0]}</span>
            {post.likes > 1 && <> and <span className="font-medium text-slate-700">{post.likes - 1} others</span></>}
          </p>
        </div>
      )}

      {post.commentList.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {!showAllComments && post.commentList.length > 1 && (
            <button onClick={() => setShowAllComments(true)} className="text-xs text-slate-400 hover:text-slate-600">View all {post.commentList.length} comments</button>
          )}
          {visibleComments.map((c) => <p key={c.id} className="text-xs text-slate-600"><span className="font-semibold text-slate-800">{c.author}</span> {c.text}</p>)}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        <Avatar size={26} grad="violet" initials="AS" />
        <input value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitComment()}
          placeholder="Add a comment…" className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent" />
        <button onClick={submitComment} disabled={!commentText.trim()} className="text-violet-600 disabled:text-slate-300"><Send size={16} /></button>
      </div>
    </article>
  );
}

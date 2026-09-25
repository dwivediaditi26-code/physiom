import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Composer from "../components/feed/Composer.jsx";
import FeedPostCard from "../components/feed/FeedPostCard.jsx";
import FeedRightRail from "../components/feed/FeedRightRail.jsx";
import PostDetailModal from "../components/feed/PostDetailModal.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

const TABS = ["All", "Following"];

// Case Discussion (2026-09-25, Aditi: separate top-level tab, not buried
// inside the general Feed) -- the Quora-style clinical Q&A post type added
// 2026-09-23 (post_type='discussion', add_clinical_discussions.sql) already
// existed and was fully wired up (composer, card, threaded replies,
// notifications); it just had no home of its own, mixed in with every other
// post type on /feed. This page is the same list, filtered to that one
// type, reusing FeedPostCard/Composer/PostDetailModal as-is rather than
// building a second post-rendering pipeline.
export default function CaseDiscussionsPage() {
  const { posts, feedError, clearFeedError } = useAppData();
  const [activeTab, setActiveTab] = useState("All");
  const [searchParams, setSearchParams] = useSearchParams();
  const openPostId = searchParams.get("post");

  const discussions = posts.filter((p) => p.postType === "discussion");
  const openPost = openPostId ? discussions.find((p) => p.id === openPostId) : null;
  const visiblePosts = activeTab === "Following" ? discussions.filter((p) => p.isSelf || p.following) : discussions;

  return (
    <>
      <main className="flex-1 min-w-0 max-w-2xl mx-auto">
        <div className="mb-4">
          <h1 className="pf-font-head text-xl font-extrabold text-slate-900 mb-1">Case Discussion</h1>
          <p className="pf-font-body text-sm text-slate-500">Ask a clinical question, discuss a case, get input from other physios.</p>
        </div>

        <div className="flex items-center gap-1 mb-4">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pf-font-head shrink-0 px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors focus:outline-none ${activeTab === tab ? "bg-[#FFB020] text-[#3A2A00]" : "text-[#8A7FA3] hover:bg-[#F7F5FF]"}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <Composer />
          {feedError && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
              <p className="pf-font-body text-xs text-rose-700 flex-1">{feedError}</p>
              <button type="button" onClick={clearFeedError} aria-label="Dismiss" className="text-rose-400 text-xs font-bold">✕</button>
            </div>
          )}
          {visiblePosts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              {activeTab === "Following" ? "No discussions from people you follow yet." : "Nothing here yet — start a discussion above."}
            </div>
          ) : visiblePosts.map((post) => <FeedPostCard key={post.id} post={post} />)}
        </div>
      </main>
      <FeedRightRail />
      {openPost && <PostDetailModal post={openPost} onClose={() => setSearchParams({}, { replace: true })} />}
    </>
  );
}

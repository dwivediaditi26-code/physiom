import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import FeedPostCard from "../components/feed/FeedPostCard.jsx";
import FeedRightRail from "../components/feed/FeedRightRail.jsx";
import { useAppData } from "../context/AppDataContext.jsx";
import { trackEvent } from "../../analytics/trackEvent.js";

// Real page instead of a popup card (2026-09-29, Aditi: a post/case
// discussion "should not open in a new tab... it should open on that page
// itself"). GridPostCard.jsx (Profile/Saved/Explore grids) and post
// notification links used to open PostDetailModal.jsx, a dialog floating
// over a dimmed backdrop that had to be dismissed with an X. This renders
// the exact same FeedPostCard used everywhere else as a normal page inside
// AppShell, so a post reads like any other PhysioFeed screen -- scrollable,
// with a back arrow, not a card on top of the page.
export default function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { posts, canGoBack, goBack } = useAppData();
  const post = posts.find((p) => p.id === postId);

  useEffect(() => {
    if (post?.postType === "discussion") trackEvent("case_viewed", { entityType: "post", entityId: post.id });
  }, [post?.id, post?.postType]);

  // Goes through AppDataContext's shared back-depth counter, not a raw
  // navigate(-1), so this stays in sync with AppFull.jsx's outer "← Back"
  // button and Header.jsx's own chevron (see goBack()'s docstring --
  // calling navigate(-1) directly here would desync that counter). Falls
  // back to /feed on the rare direct landing with nothing to go back to.
  const handleBack = () => (canGoBack ? goBack() : navigate("/feed"));

  return (
    <>
      <main className="flex-1 min-w-0 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft size={16} /> Back
        </button>
        {post ? (
          <FeedPostCard post={post} />
        ) : (
          <div className="text-center py-16 text-slate-400 text-sm">This post isn't available anymore.</div>
        )}
      </main>
      <FeedRightRail />
    </>
  );
}

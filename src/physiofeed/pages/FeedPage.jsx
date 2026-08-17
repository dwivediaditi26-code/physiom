import { useState } from "react";
import StoriesBar from "../components/feed/StoriesBar.jsx";
import Composer from "../components/feed/Composer.jsx";
import FeedPostCard from "../components/feed/FeedPostCard.jsx";
import FeedRightRail from "../components/feed/FeedRightRail.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

const TABS = ["For You", "Following", "Research", "Case Studies", "Techniques", "Education"];

export default function FeedPage() {
  const { posts } = useAppData();
  const [activeTab, setActiveTab] = useState("For You");

  const visiblePosts =
    activeTab === "For You" ? posts
    : activeTab === "Following" ? posts.filter((p) => p.isSelf || p.following)
    : posts.filter((p) => p.category === activeTab);

  return (
    <>
      <main className="flex-1 min-w-0 max-w-2xl mx-auto">
        <StoriesBar />
        <div className="flex items-center gap-1 mb-4 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none ${activeTab === tab ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          <Composer />
          {visiblePosts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">Nothing here yet — be the first to post in {activeTab}.</div>
          ) : visiblePosts.map((post) => <FeedPostCard key={post.id} post={post} />)}
        </div>
      </main>
      <FeedRightRail />
    </>
  );
}

import { useEffect, useState } from "react";
import GridPostCard from "../components/feed/GridPostCard.jsx";
import ResearchCard from "../components/evidence/ResearchCard.jsx";
import NewsCard from "../components/news/NewsCard.jsx";
import NewsDetailModal from "../components/news/NewsDetailModal.jsx";
import * as db from "../data/db.js";
import { useAppData } from "../context/AppDataContext.jsx";

export default function SavedPage() {
  const { posts, evidence } = useAppData();
  const [tab, setTab] = useState("Posts");
  const savedPosts = posts.filter((p) => p.saved);
  const savedEvidence = evidence.filter((e) => e.saved);

  // News bookmarks reuse saved_items too (see db.js toggleSaveNews), but
  // that table isn't in AppDataContext's preloaded state the way
  // posts/evidence are, so this tab loads on demand instead.
  const [savedNews, setSavedNews] = useState(null);
  const [newsError, setNewsError] = useState(null);
  const [openItem, setOpenItem] = useState(null);

  useEffect(() => {
    if (tab !== "News" || savedNews !== null) return;
    db.getSavedNews().then(setSavedNews).catch((e) => { setNewsError(e.message || "Couldn't load saved news."); setSavedNews([]); });
  }, [tab, savedNews]);

  const toggleSaveNews = async (item) => {
    setSavedNews((list) => (list || []).filter((n) => n.id !== item.id));
    try { await db.toggleSaveNews(item.id); } catch { /* already optimistically removed; a stale re-add is harmless on next visit */ }
  };

  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5">
        <h1 className="pf-font-head text-xl font-extrabold text-[#2B2140] mb-1">Saved</h1>
        <p className="pf-font-body text-sm text-[#8A7FA3]">Everything you've bookmarked, in one place.</p>
      </div>

      <div className="flex items-center gap-1 mb-5 bg-white border-2 border-[#F1EEFB] rounded-2xl p-1.5 shadow-sm w-fit overflow-x-auto no-scrollbar">
        {["Posts", "Research", "News"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pf-font-head shrink-0 px-4 py-1.5 rounded-xl text-sm font-bold transition-colors ${tab === t ? "bg-[#FFB020] text-[#3A2A00]" : "text-[#8A7FA3] hover:bg-[#F7F5FF]"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Posts" ? (
        savedPosts.length === 0 ? (
          <div className="pf-font-body text-center py-16 text-[#A79CC4] text-sm">No saved posts yet — tap the bookmark icon on any post.</div>
        ) : <div className="grid sm:grid-cols-2 gap-4">{savedPosts.map((p) => <GridPostCard key={p.id} post={p} />)}</div>
      ) : tab === "Research" ? (
        savedEvidence.length === 0 ? (
          <div className="pf-font-body text-center py-16 text-[#A79CC4] text-sm">No saved research yet — tap the bookmark icon on any article.</div>
        ) : <div className="grid sm:grid-cols-2 gap-4">{savedEvidence.map((a) => <ResearchCard key={a.id} article={a} />)}</div>
      ) : (
        <>
          {newsError && <p className="text-xs text-rose-600 mb-3">{newsError}</p>}
          {savedNews === null ? (
            <div className="pf-font-body text-center py-16 text-[#A79CC4] text-sm">Loading…</div>
          ) : savedNews.length === 0 ? (
            <div className="pf-font-body text-center py-16 text-[#A79CC4] text-sm">No saved news yet — tap the bookmark icon on any story in News.</div>
          ) : (
            <div className="space-y-3">
              {savedNews.map((item) => (
                <NewsCard key={item.id} item={item} saved onToggleSave={toggleSaveNews} onOpen={setOpenItem} />
              ))}
            </div>
          )}
        </>
      )}

      {openItem && (
        <NewsDetailModal item={openItem} saved onToggleSave={toggleSaveNews} onClose={() => setOpenItem(null)} />
      )}
    </main>
  );
}

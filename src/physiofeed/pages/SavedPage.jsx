import { useState } from "react";
import GridPostCard from "../components/feed/GridPostCard.jsx";
import ResearchCard from "../components/evidence/ResearchCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

export default function SavedPage() {
  const { posts, evidence } = useAppData();
  const [tab, setTab] = useState("Posts");
  const savedPosts = posts.filter((p) => p.saved);
  const savedEvidence = evidence.filter((e) => e.saved);

  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5">
        <h1 className="pf-font-head text-xl font-extrabold text-[#2B2140] mb-1">Saved</h1>
        <p className="pf-font-body text-sm text-[#8A7FA3]">Everything you've bookmarked, in one place.</p>
      </div>

      <div className="flex items-center gap-1 mb-5 bg-white border-2 border-[#F1EEFB] rounded-2xl p-1.5 shadow-sm w-fit">
        {["Posts", "Research"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pf-font-head px-4 py-1.5 rounded-xl text-sm font-bold transition-colors ${tab === t ? "bg-[#FFB020] text-[#3A2A00]" : "text-[#8A7FA3] hover:bg-[#F7F5FF]"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Posts" ? (
        savedPosts.length === 0 ? (
          <div className="pf-font-body text-center py-16 text-[#A79CC4] text-sm">No saved posts yet — tap the bookmark icon on any post.</div>
        ) : <div className="grid sm:grid-cols-2 gap-4">{savedPosts.map((p) => <GridPostCard key={p.id} post={p} />)}</div>
      ) : (
        savedEvidence.length === 0 ? (
          <div className="pf-font-body text-center py-16 text-[#A79CC4] text-sm">No saved research yet — tap the bookmark icon on any article.</div>
        ) : <div className="grid sm:grid-cols-2 gap-4">{savedEvidence.map((a) => <ResearchCard key={a.id} article={a} />)}</div>
      )}
    </main>
  );
}

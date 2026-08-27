import { useState } from "react";
import { X } from "lucide-react";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-[11px] font-medium py-1 px-3">
      <span className="flex-1">Demo content — people and posts aren't real yet.</span>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 text-amber-500 hover:text-amber-700">
        <X size={13}/>
      </button>
    </div>
  );
}

export default function AppShell({ children }) {
  const { loading } = useAppData();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <DemoBanner/>
      <Header />
      {/* pb-24 (not py-6's plain bottom-6) below 768px: physiom's own
          outer bottom nav bar (.pm-bnav in src/utils.jsx) is
          position:fixed;bottom:0 and sits OUTSIDE this component tree, so
          nothing here knew to leave room for it -- the last ~59px of
          every PhysioFeed page (most visibly the message composer on
          MessagesPage.jsx, and the compose bar on FeedPostCard.jsx) was
          rendering right underneath it, unclickable and mostly hidden. */}
      <div className="max-w-[1200px] mx-auto flex gap-6 px-4 sm:px-6 pt-6 pb-24 md:pb-6">
        <Sidebar />
        {children}
      </div>
    </div>
  );
}

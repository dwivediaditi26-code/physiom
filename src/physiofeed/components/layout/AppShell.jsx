import { useState } from "react";
import { X } from "lucide-react";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

// P9 (2026-09-22): this used to render for everyone, including a signed-in
// clinician whose feed, People list and notifications are entirely real --
// telling them their own colleagues and posts "aren't real yet". It's a
// guest-mode banner, so it's shown in guest mode: db.js hands guests the
// shared demo identity (CURRENT_USER, `isDemo`) rather than a real row.
function DemoBanner({ show }) {
  const [dismissed, setDismissed] = useState(false);
  if (!show || dismissed) return null;
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
  const { loading, profile, actionError, clearActionError } = useAppData();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <DemoBanner show={!!profile?.isDemo} />
      {/* P9: one place for a failed follow / save / join / mark-read to
          land, since those writes stopped faking success. Sits under the
          header so it's visible from whichever page raised it. */}
      {actionError && (
        <div className="flex items-start gap-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-[11px] font-medium py-1.5 px-3">
          <span className="flex-1">{actionError}</span>
          <button onClick={clearActionError} aria-label="Dismiss" className="shrink-0 text-rose-400 hover:text-rose-600">
            <X size={13}/>
          </button>
        </div>
      )}
      <Header />
      {/* pb-24 (not py-6's plain bottom-6) below 1024px: physiom's own
          outer bottom nav bar (.pm-bnav in src/utils.jsx) is
          position:fixed;bottom:0 and sits OUTSIDE this component tree, so
          nothing here knew to leave room for it -- the last ~59px of
          every PhysioFeed page (most visibly the message composer on
          MessagesPage.jsx, and the compose bar on FeedPostCard.jsx) was
          rendering right underneath it, unclickable and mostly hidden. */}
      <div className="max-w-[1200px] mx-auto flex gap-6 px-4 sm:px-6 pt-6 pb-24 lg:pb-6">
        <Sidebar />
        {children}
      </div>
    </div>
  );
}

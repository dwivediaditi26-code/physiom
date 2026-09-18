import { useEffect } from "react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { AppDataProvider } from "./context/AppDataContext.jsx";
import PhysioFeedRoutes from "./PhysioFeedRoutes.jsx";
import "./physiofeed.css";

// Entry point for the PhysioFeed tab. Uses MemoryRouter (an in-memory
// history stack), not BrowserRouter -- physiom already manages the real
// browser URL/back-button itself (see navTo() in AppFull.jsx, which calls
// window.history.pushState directly). A second router driving the real URL
// would fight with that; MemoryRouter keeps PhysioFeed's own Feed/Explore/
// People/Communities/Evidence/Saved/Profile navigation fully self-contained
// and invisible to the browser's address bar and back button.

// Every route JumpBridge is allowed to land on from outside PhysioFeed --
// the mobile global header's relocated search/bell/message icons
// (AppFull.jsx) and Home's Evidence tile/previews (DashboardModules.jsx)
// both go through this, naming the destination as a bare key rather than
// a path so callers outside this folder never need to know PhysioFeed's
// actual route strings.
const JUMPABLE_TABS = new Set(["evidence", "notifications", "messages", "people"]);

// This tab stays mounted once visited (AppFull.jsx keeps every tab alive
// in the shared .pm-main container instead of unmounting it), so
// MemoryRouter's own initialEntries -- read once, on first mount -- can't
// react to a later request to jump somewhere specific. jumpTo carries
// navTo()'s own ctx object through (a fresh reference on every real
// navTo() call, even to the same key) so this can imperatively re-route on
// each one (2026-09-17, Aditi: "when we click on the evidences it should
// take us to the evidence page... it is taking us directly to the physio
// feed"; then, for the header icons: "search notification and message
// should go up there when we open the physio feed").
function JumpBridge({ jumpTo }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!jumpTo || !JUMPABLE_TABS.has(jumpTo.pfTab)) return;
    navigate(`/${jumpTo.pfTab}`, { replace: true, state: jumpTo.pfArticleId ? { articleId: jumpTo.pfArticleId } : undefined });
  }, [jumpTo, navigate]);
  return null;
}

export default function PhysioFeedEntry({ jumpTo }) {
  return (
    <div className="physiofeed-root">
      <MemoryRouter initialEntries={[JUMPABLE_TABS.has(jumpTo?.pfTab) ? `/${jumpTo.pfTab}` : "/feed"]}>
        <AppDataProvider>
          <JumpBridge jumpTo={jumpTo}/>
          <PhysioFeedRoutes/>
        </AppDataProvider>
      </MemoryRouter>
    </div>
  );
}

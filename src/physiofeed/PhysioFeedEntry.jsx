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

// This tab stays mounted once visited (AppFull.jsx keeps every tab alive
// in the shared .pm-main container instead of unmounting it), so
// MemoryRouter's own initialEntries -- read once, on first mount -- can't
// react to a later Home-screen "Evidence" tap. jumpTo carries navTo()'s
// own ctx object through (a fresh reference on every real navTo() call,
// even to the same key) so this can imperatively re-route on each one
// (2026-09-17, Aditi: "when we click on the evidences it should take us
// to the evidence page... it is taking us directly to the physio feed").
function JumpBridge({ jumpTo }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!jumpTo || jumpTo.pfTab !== "evidence") return;
    navigate("/evidence", { replace: true, state: jumpTo.pfArticleId ? { articleId: jumpTo.pfArticleId } : undefined });
  }, [jumpTo, navigate]);
  return null;
}

export default function PhysioFeedEntry({ jumpTo }) {
  return (
    <div className="physiofeed-root">
      <MemoryRouter initialEntries={[jumpTo?.pfTab === "evidence" ? "/evidence" : "/feed"]}>
        <AppDataProvider>
          <JumpBridge jumpTo={jumpTo}/>
          <PhysioFeedRoutes/>
        </AppDataProvider>
      </MemoryRouter>
    </div>
  );
}

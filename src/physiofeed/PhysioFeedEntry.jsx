import { useEffect, useRef } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { AppDataProvider, useAppData } from "./context/AppDataContext.jsx";
import { DemoConversationsProvider } from "./context/DemoConversationsContext.jsx";
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
const JUMPABLE_TABS = new Set(["evidence", "notifications", "messages", "people", "search"]);

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
//
// Each jumpTo is acted on once (2026-09-20): react-router hands out a new
// `navigate` on every route change, so this effect used to re-run after any
// tap inside PhysioFeed and pull you straight back to the jump target --
// after the header search icon, the section strip's Evidence/Saved/... did
// nothing and you stayed on the search page.
function JumpBridge({ jumpTo }) {
  const navigate = useNavigate();
  const handled = useRef(null);
  useEffect(() => {
    if (!jumpTo || !JUMPABLE_TABS.has(jumpTo.pfTab) || handled.current === jumpTo) return;
    handled.current = jumpTo;
    navigate(`/${jumpTo.pfTab}`, { replace: true, state: jumpTo.pfArticleId ? { articleId: jumpTo.pfArticleId } : undefined });
  }, [jumpTo, navigate]);
  return null;
}

// Lets AppFull.jsx's in-header "← Back" button unwind PhysioFeed's own
// internal navigation one step at a time instead of always falling
// straight through to window.history.back() -- which, since MemoryRouter
// never touches real browser history (see the file header comment above),
// otherwise pops clean past everything visited inside PhysioFeed in one
// jump (2026-09-23, "it should take us just [the] previous open page").
// The actual depth-tracking now lives in AppDataContext (canGoBack/goBack)
// -- Header.jsx's own back chevron reads the exact same state (2026-09-28,
// Aditi: "it should take us to there not the scrolling" -- it used to call
// react-router's plain navigate(-1) directly, a second, independent notion
// of "back" that could disagree with this one). This is just a thin relay
// onto the ref AppFull.jsx reads, since that button lives outside this
// whole provider tree.
function BackBridge({ backRef }) {
  const { canGoBack, goBack } = useAppData();
  useEffect(() => {
    if (!backRef) return;
    backRef.current = { canGoBack, goBack };
  });
  return null;
}

// Lets an outside screen (a clinical assessment's "Share as Clinical
// Discussion" button) hand off assembled section text and land the user
// straight in an open, pre-filled Discussion Composer -- same navTo()/
// jumpTo channel as JumpBridge above, just carrying a payload instead of a
// bare tab name, and consumed with the same ref-identity guard so it only
// fires once per distinct navTo() call. Needs AppDataContext (for
// composerType/composerOpen/composerPrefill), so it has to render inside
// <AppDataProvider>, same as JumpBridge/BackBridge.
function ShareBridge({ jumpTo }) {
  const { setComposerType, setComposerOpen, setComposerPrefill } = useAppData();
  const handled = useRef(null);
  useEffect(() => {
    if (!jumpTo?.pfShareDiscussion || handled.current === jumpTo) return;
    handled.current = jumpTo;
    setComposerPrefill(jumpTo.pfShareDiscussion.text);
    setComposerType("discussion");
    setComposerOpen(true);
  }, [jumpTo, setComposerType, setComposerOpen, setComposerPrefill]);
  return null;
}

// Same channel again, for the "+" AppFull.jsx now renders in its own top
// header next to search/bell/messages (2026-09-28, Aditi's redesigned-top-nav
// reference) -- that button lives outside this whole provider tree, so it
// can only ask for the Create sheet via navTo()'s jumpTo, same as the other
// relocated icons.
function CreatePanelBridge({ jumpTo }) {
  const { setCreatePanelOpen, setComposerOpen } = useAppData();
  const handled = useRef(null);
  useEffect(() => {
    if (!jumpTo?.pfOpenCreate || handled.current === jumpTo) return;
    handled.current = jumpTo;
    // Bug fix (2026-09-28, Aditi: "half is cutting" -- a screenshot showing
    // two overlapping cards): the Feed composer bar has its own independent
    // open/expanded state (composerOpen/composerType). If it was already
    // expanded (e.g. left open on CreateTypePicker) when "+" opens this
    // sheet on top, both were visible at once, ghosting through the
    // backdrop on wider widths. Collapsing it first keeps only one create
    // surface open at a time.
    setComposerOpen(false);
    setCreatePanelOpen(true);
  }, [jumpTo, setCreatePanelOpen, setComposerOpen]);
  return null;
}

// PhysioFeed's own pages (Feed/Explore/Messages/Profile/...) live entirely
// inside this MemoryRouter, invisible to the real browser URL (see the file
// header comment) -- so `window.__pmScreen` (set once, to "physiofeed", by
// navTo() in AppFull.jsx) can't see which PhysioFeed page is actually open.
// This mirrors that detail into `window.__pmSubScreen` for errorReporter.js,
// without changing what "screen" means for the rest of the admin dashboard
// (still just "physiofeed").
function ScreenTrackerBridge() {
  const location = useLocation();
  useEffect(() => {
    window.__pmSubScreen = location.pathname;
    return () => { window.__pmSubScreen = null; };
  }, [location.pathname]);
  return null;
}

export default function PhysioFeedEntry({ jumpTo, backRef }) {
  return (
    <div className="physiofeed-root">
      <MemoryRouter initialEntries={[JUMPABLE_TABS.has(jumpTo?.pfTab) ? `/${jumpTo.pfTab}` : "/feed"]}>
        <AppDataProvider>
          <DemoConversationsProvider>
            <JumpBridge jumpTo={jumpTo}/>
            <BackBridge backRef={backRef}/>
            <ShareBridge jumpTo={jumpTo}/>
            <CreatePanelBridge jumpTo={jumpTo}/>
            <ScreenTrackerBridge/>
            <PhysioFeedRoutes/>
          </DemoConversationsProvider>
        </AppDataProvider>
      </MemoryRouter>
    </div>
  );
}

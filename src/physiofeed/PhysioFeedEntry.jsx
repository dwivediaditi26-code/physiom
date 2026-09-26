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
// `depthRef` counts internal navigations since this tab was last (re)mounted;
// `goingBackRef` tells the location-change effect below "this change is
// OUR OWN goBack() call, don't count it as a new forward step."
function BackBridge({ backRef }) {
  const location = useLocation();
  const navigate = useNavigate();
  const depthRef = useRef(0);
  const goingBackRef = useRef(false);
  // Seeded directly from the first render's location.key, NOT set inside
  // an effect -- React.StrictMode (see main.jsx) double-invokes effects in
  // dev, and a run-once "have I mounted yet" flag isn't idempotent against
  // that (the 2nd invocation sees the flag already flipped and counts a
  // phantom step that never happened). Comparing against the last-seen KEY
  // is: both invocations see the same unchanged location.key on a no-op
  // re-run, so the comparison is a safe no-op either way it fires.
  const lastKeyRef = useRef(location.key);

  useEffect(() => {
    if (location.key === lastKeyRef.current) return;
    lastKeyRef.current = location.key;
    if (goingBackRef.current) { goingBackRef.current = false; depthRef.current = Math.max(0, depthRef.current - 1); return; }
    depthRef.current += 1;
    // location.key (not .pathname) so a same-path, different-query nav --
    // e.g. a notification's /feed?post=<id> deep link opening a different
    // post while already on /feed -- still counts as a real step.
  }, [location.key]);

  useEffect(() => {
    if (!backRef) return;
    backRef.current = {
      canGoBack: depthRef.current > 0,
      goBack: () => {
        if (depthRef.current <= 0) return;
        goingBackRef.current = true;
        navigate(-1);
      },
    };
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
            <ScreenTrackerBridge/>
            <PhysioFeedRoutes/>
          </DemoConversationsProvider>
        </AppDataProvider>
      </MemoryRouter>
    </div>
  );
}

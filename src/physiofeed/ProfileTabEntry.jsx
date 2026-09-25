import { MemoryRouter } from "react-router-dom";
import { AppDataProvider } from "./context/AppDataContext.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import "./physiofeed.css";

// Reuses PhysioFeed's own profile page design (cover, avatar, stats, tabs,
// posts) for physiom's real Profile tab -- same component, no separate
// build.
//
// Bug fix (2026-08-19): this used to skip MemoryRouter entirely on the
// (once-true) assumption that "ProfilePage and its subcomponents don't use
// any react-router hooks". That stopped being true the moment
// FeedPostCard.jsx gained author <Link>s (for jumping to someone's
// profile) and GridPostCard.jsx started opening PostDetailModal.jsx (which
// renders that same FeedPostCard for the full comment view) -- clicking a
// post's comment icon here crashed the whole tab with "useHref() may be
// used only in the context of a <Router>". Wrapped the same way
// PhysioFeedEntry.jsx already wraps the real PhysioFeed tab, for the same
// reason: an isolated MemoryRouter, not BrowserRouter, so it doesn't fight
// with physiom's own real browser URL/back-button handling.
//
// The bio/stats/posts shown are still PhysioFeed's demo data until a real
// profile exists (same caveat as the PhysioFeed tab itself) -- the banner
// that used to spell this out here was removed (2026-09-22, Aditi: "remove
// this demo profile thing written"), so ProfilePage.jsx's own empty/zero
// states are what surfaces that now. Real sign-out is wired in below the
// profile card since that's the one genuinely real, necessary action this
// screen needs regardless of demo content.
//
// `pf-bare-entry`: unlike PhysioFeedEntry.jsx (the real PhysioFeed tab),
// this route renders ProfilePage with no AppShell/Header.jsx above it, so
// the marker class is available on the root should any sticky child ever
// need to clear physiom's own top bar directly rather than a .pf-header
// that isn't here. The sticky sub-header this originally paired with
// (ProfileTabs.jsx) is gone in the 2026-09-24 single-scroll redesign.
export default function ProfileTabEntry({ onSignOut }) {
  return (
    <div className="physiofeed-root pf-bare-entry">
      <MemoryRouter initialEntries={["/profile"]}>
        <AppDataProvider>
          <div className="flex gap-6">
            <ProfilePage/>
          </div>
          <button onClick={onSignOut} className="w-full mt-4 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-sm text-rose-600">
            Sign out
          </button>
        </AppDataProvider>
      </MemoryRouter>
    </div>
  );
}
